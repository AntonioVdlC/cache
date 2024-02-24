# Cache

[![version](https://img.shields.io/npm/v/@antoniovdlc/cache.svg)](http://npm.im/@antoniovdlc/cache)
[![issues](https://img.shields.io/github/issues-raw/antoniovdlc/cache.svg)](https://github.com/AntonioVdlC/cache/issues)
[![downloads](https://img.shields.io/npm/dt/@antoniovdlc/cache.svg)](http://npm.im/@antoniovdlc/cache)
[![license](https://img.shields.io/npm/l/@antoniovdlc/cache.svg)](http://opensource.org/licenses/MIT)

A simple, yet over-engineered, cache.

## Installation

This package is distributed via npm:

```
npm install @antoniovdlc/cache
```

## Motivation

I was just writing a blog post on implementing an LRU cache, and I ended up implementing this monstruosity. Well, here it is!


## TL;DR

By default, the cache behaves as a least-recently-used (LRU) cache.

```ts
const cache = new Cache<string, number>(2);
cache.put("a", 1);
cache.put("b", 2);
cache.get("a"); // 1
cache.put("c", 3); // `b` is evicted
```

_You can check the `test` folder for even more examples!_

## Methods

### Instantiating a cache

To instantiate a cache, call `new` on the class, and pass it a `capacity` value.
```ts
const cache = new Cache<string, number>(2);
```

#### options

An optional `options` object can be passed as a second argument.
```ts
type CacheOptions<K, V> = {
  persistence?: CachePersistence<K, V>;
  autoPersist?: boolean;
  ttl?: number;
  ttlCleanupInterval?: number;
  evictionPolicy?: CacheEvictionPolicy<K, V>;
};
```
The use of those options is explained further down this document.

### Inserting data

To insert data, use the `put` method.

#### put(key: K, value: V, ttl?: number): void
```ts
const cache = new Cache<string, number>(2);
cache.put("a", 1);
```

### Retrieving data

To retrieve date, use either the `get` or the `peek` methods. To check that data is present in the cache, use the `has` method.

#### get(key: K): V | undefined
```ts
const cache = new Cache<string, number>(2);
cache.put("a", 1);
cache.get("a"); // 1
```
> Note that calling this method marks the retrieved item as most recently used.

#### peek(key: K): V | undefined
```ts
const cache = new Cache<string, number>(2);
cache.put("a", 1);
cache.peek("a"); // 1
```
> Note that calling this method does not mark the retrieved item as most recently used.

#### has(key: K): boolean
```ts
const cache = new Cache<string, number>(2);
cache.put("a", 1);
cache.has("a"); // true
```

### Removal of data

Data is automatically evicted from the cache when at capacity and inserting new data based on the eviction policy (by default, LRU). Some methods do allow for manual removal.

#### remove(key: K): void
```ts
const cache = new Cache<string, number>(2);
cache.put("a", 1);
cache.has("a"); // true
cache.remove("a");
cache.has("a"); // false
```

#### clear(): void
```ts
const cache = new Cache<string, number>(2);
cache.put("a", 1);
cache.put("b", 2);
cache.size; // 2
cache.clear();
cache.size; // 0
```

### Resizing

#### resize(capacity: number): void

It is possible to resize the cache after initialization.

```ts
const cache = new Cache<string, number>(2);
cache.put("a", 1);
cache.put("b", 2);
cache.size; // 2
cache.resize(1);
cache.size; //1
```

> Note that if the new `capacity` is lesser than the current size of the cache, items will be evicted according to the eviction policy until the cache size is no longer greater than its capacity.

## Statistics

To introspect the cache, the following statistics are calculated:

```ts
type CacheStats = {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  effectiveness: number;
};
```

### .stats

Stats are accessible via the `stats` getter.
```ts
const cache = new Cache<string, number>(2);
cache.stats;
```

## Callbacks and Events

Callbacks and events allow attaching custom logic to _interesting_ cache events.

```ts
enum CacheEvent {
  Insertion = "insertion",
  Eviction = "eviction",
  Removal = "removal",
  Full = "full",
  Empty = "empty",
}
```

Event handlers may receive an item from the cache depending on the event.

```ts
type CacheEventHandler<K, V> = (
  event: CacheEvent,
  item?: { key: K; value: V },
) => void;
```

### on(event: CacheEvent, callback: CacheEventHandler<K, V>): CacheEventCallback

To attach a handler to an event, use the `on` method.
```ts
const cache = new Cache<string, number>(1);
cache.on(CacheEvent.Insertion, (item) => console.log(item));
cache.put("a", 1); // { key: "a", value: 1 }
```

The `on` method returns an object with an `unregister` method, which can be called to remove the handler.
```ts
const cache = new Cache<string, number>(2);
const { unregister } = cache.on(CacheEvent.Insertion, (item) => console.log(item));
cache.put("a", 1); // { key: "a", value: 1 }
unregister();
cache.put("b", 2);
```

## Persistence

Persistence can be added to the cache with an instance of `CachePersistence<K, V>`.

```ts
class CachePersistence<K, V> {
  constructor(
      cacheKey: string = uuidv4(),
      logic?: { persist: (cache: Map<K, V>) => void; restore: () => Map<K, V> },
    ) { ... }
}
```
> By default, the persistence will use `localStorage`.

Then this instance can be passed to the cache either in the constructor, or later in a setter.

```ts
const persistence = new CachePersistence<string, number>();
const cache = new Cache<string, number>(2, { persistence });
```
or
```ts
const cache = new Cache<string, number>(2);
cache.persistence = new CachePersistence<string, number>();
```

Auto-persistence can be turned on by passing an `autoPersist` option to the cache constructor. It is off by default.

```ts
const persistence = new CachePersistence<string, number>();
const cache = new Cache<string, number>(2, { persistence, autoPersist: true });
```
or
```ts
const persistence = new CachePersistence<string, number>();
const cache = new Cache<string, number>(2, { persistence });
cache.autoPersist = true;
```

## TTL

Optionally, the cache takes into account time-to-live (TTL) for its items.

It can be set as a default by providing a `ttl` option to the cache constructor or via a setter.

```ts
const cache = new Cache<string, number>(2, { ttl: 1234 });
```
or
```ts
const cache = new Cache<string, number>(2);
cache.ttl = 1234;
```

The cache implements a reactive cleanup, meaning that items are evicted from the cache on cache operations (`get`, `peek`, `has`).

It can also be provided on a per-item basis in the `put` method.
```ts
const cache = new Cache<string, number>(2, { ttl: 1234 });
cache.put("a", 1, 4321);
```

Optionally, an internal clock can be set to wipe expired items from the cache at given intervals (proactive cleanup). This can complement the default reactive cleanup.

```ts
const cache = new Cache<string, number>(1, {
  ttl: 50,
  ttlCleanupInterval: 100,
});
cache.put("a", 1);
await _for(150);
cache.has("a"); // false
```

## Custom Eviction Policies

Finally, the cache allows for custom eviction policies.

This can be used, for example, to implement an MRU (most recently used) cache:
```ts
const cache = new Cache<string, number>(2, {
  evictionPolicy: (cache) => cache.last!,
});
```

> By default, if no `evictionPolicy` is passed, the cache implements an LRU (least recently used) policy.

### FIFO, LIFO, RR

It is possible to implement other types of cache policies by inheriting and making small tweaks to the base `Cache` class.

For example, for FIFO (first in, first out), LIFO (last in, last out) and RR (random) cache policies, we can create a `CacheWithList` class and pass different eviction policies.

```ts
class CacheWithList<K, V> extends Cache<K, V> {
  list?: K[];

  constructor(capacity: number, options?: CacheOptions<K, V>) {
    super(capacity, options);
    this.list = [];
  }

  put(key: K, value: V, ttl?: number) {
    super.put(key, value, ttl);
    this.list!.push(key);
  }
}
```

```ts
// FIFO
const cache = new CacheWithList<string, number>(2, {
  evictionPolicy: (cache: CacheWithList<string, number>) =>
    cache.list!.shift()!,
});

// LIFO
const cache = new CacheWithList<string, number>(2, {
  evictionPolicy: (cache: CacheWithList<string, number>) =>
    cache.list!.pop()!,
});

// RR
const cache = new CacheWithList<string, number>(2, {
  evictionPolicy: (cache: CacheWithList<string, number>) => {
    const index = Math.floor(Math.random() * cache.list!.length);
    const key = cache.list![index];

    cache.list!.splice(index, 1);

    return key;
  },
});
```


### LFU, MFU

Similarly, we can also implement frequency-based cache policies.

```ts
class CacheWithFrequencies<K, V> extends Cache<K, V> {
  frequencies?: Map<K, number>;

  constructor(capacity: number, options?: CacheOptions<K, V>) {
    super(capacity, options);
    this.frequencies = new Map();
  }

  get(key: K): V | undefined {
    const value = super.get(key);
    if (value) {
      this.frequencies!.set(key, (this.frequencies!.get(key) || 0) + 1);
    } else {
      this.frequencies!.delete(key);
    }
    return value;
  }

  put(key: K, value: V, ttl?: number) {
    super.put(key, value, ttl);
    this.frequencies!.set(key, 0);
  }

  remove(key: K) {
    super.remove(key);
    this.frequencies!.delete(key);
  }
}
```

```ts
// LFU
const cache = new CacheWithFrequencies<string, number>(2, {
  evictionPolicy: (cache: CacheWithFrequencies<string, number>) => {
    let min = Infinity;
    let lfu = "";
    for (const [key, freq] of cache.frequencies!) {
      if (freq < min) {
        min = freq;
        lfu = key;
      }
    }
    return lfu;
  },
});

// MFU
const cache = new CacheWithFrequencies<string, number>(2, {
  evictionPolicy: (cache: CacheWithFrequencies<string, number>) => {
    let max = -Infinity;
    let mfu = "";
    for (const [key, freq] of cache.frequencies!) {
      if (freq > max) {
        max = freq;
        mfu = key;
      }
    }
    return mfu;
  },
});
```
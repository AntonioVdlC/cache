/**
 * A simple LRU cache implementation
 * @class LRUCache
 *
 * @template K - The key type
 * @template V - The value type
 *
 * @param {number} capacity - The maximum number of items the cache can hold
 * @param {Object} [options] - The cache's persistence and auto-persist settings
 * @property {LRUCachePersistence<K, V>} [persistence] - The cache's persistence
 * @property {boolean} [autoPersist] - Whether the cache is auto-persisted (persisted on every change)
 * @property {number} [ttl] - The default time-to-live (TTL) for cache items (in ms)
 *
 * @method get - Gets the value associated with the key
 * @method put - Puts the key-value pair into the cache
 * @method peek - Gets the value associated with the key without updating the cache
 * @method has - Checks if the key exists in the cache
 * @method remove - Removes the key-value pair from the cache
 * @method clear - Clears the cache
 * @method clearStats - Clears the cache's internal stats
 * @method resize - Resizes the cache
 * @method on - Registers an event handler for the specified cache event
 * @method persist - Persists the cache
 * @method restore - Restores the cache
 * @method toMap - Converts the cache to a Map
 *
 * @getter first - Gets the first key in the cache
 * @getter last - Gets the last key in the cache
 * @getter size - Gets the number of items in the cache
 * @getter capacity - Gets the maximum number of items the cache can hold
 * @getter stats - Gets the cache's internal stats
 * @getter persistence - Gets the cache's persistence
 * @getter isAutoPersist - Gets whether the cache is auto-persisted (persisted on every change)
 * @getter ttl - Gets the default time-to-live (TTL) for cache items (in ms)
 *
 * @setter persistence - Sets the cache's persistence
 * @setter autoPersist - Sets whether the cache is auto-persisted (persisted on every change)
 * @setter ttl - Sets the default time-to-live (TTL) for cache items (in ms)
 *
 * @throws {Error} - If capacity is less than 1
 * @throws {Error} - If event being registered is invalid
 * @throws {Error} - If persistence is not set
 *
 * @example
 * const cache = new LRUCache<string, number>(2);
 * cache.put("a", 1);
 * cache.put("b", 2);
 * cache.get("a"); // 1
 * cache.put("c", 3);
 * cache.get("b"); // undefined
 *
 */
class LRUCache<K, V> {
  /**
   * @private
   * @type {number} - The maximum number of items the cache can hold
   */
  #capacity: number;

  /**
   * @private
   * @type {Map<K, V>} - The underlying map that holds the cache
   */
  #map: Map<K, V>;

  /**
   * @private
   * @type {Object} - Internal tracking of statistical cache events
   * @property {number} hit - The number of successful retrievals from the
   * cache.
   * @property {number} miss - The number of failed retrievals from the cache.
   * @property {number} eviction - The number of items that have been removed
   * from the cache by the eviction policy.
   * @property {number} access - The total number of attempts to retrieve items
   * from the cache.
   */
  #stats = {
    hit: 0,
    miss: 0,
    eviction: 0,
    access: 0,
  };

  /**
   * @private
   * @type {Object} - Internal tracking of event handlers
   */
  #eventHandlers: Record<CacheEvent, Array<CacheEventHandler<K, V>>> = {
    [CacheEvent.Insertion]: [],
    [CacheEvent.Eviction]: [],
    [CacheEvent.Removal]: [],
    [CacheEvent.Full]: [],
    [CacheEvent.Empty]: [],
  };

  /**
   * @private
   * @type {LRUCachePersistence<K, V> | undefined} - The cache's persistence
   */
  #persistence?: LRUCachePersistence<K, V>;

  /**
   * @private
   * @type {boolean} - Whether the cache is auto-persisted (persisted on every change)
   */
  #autoPersist?: boolean;

  /**
   * @private
   * @type {number} - The default time-to-live (TTL) for cache items (in ms)
   */
  #ttl?: number;

  /**
   * @private
   * @type {Map<K, number>} - The map that holds the time-to-live (TTL) for
   * cache items
   */
  #ttlMap: Map<K, number>;

  /**
   * Creates a new LRUCache
   *
   * @param {number} capacity - The maximum number of items the cache can hold
   * @param {Object} [options] - The cache's persistence and auto-persist settings
   * @property {LRUCachePersistence<K, V>} [persistence] - The cache's persistence
   * @property {boolean} [autoPersist] - Whether the cache is auto-persisted (persisted on every change)
   * @property {number} [ttl] - The default time-to-live (TTL) for cache items (in ms)
   *
   * @throws {Error} - If capacity is less than 1
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.capacity; // 2
   */
  constructor(
    capacity: number,
    options: {
      persistence?: LRUCachePersistence<K, V>;
      autoPersist?: boolean;
      ttl?: number;
    } = {},
  ) {
    if (capacity < 1) {
      throw new Error("Capacity must be greater than 0");
    }

    this.#capacity = capacity;
    this.#map = new Map();

    this.#persistence = options.persistence;
    this.#autoPersist = options.autoPersist;
    this.#ttl = options.ttl;
    this.#ttlMap = new Map();
  }

  /**
   * Evicts the least recently used item from the cache
   *
   * @private
   *
   * @param {K} key - The key to evict
   *
   * @returns {boolean} - True if the key was evicted, false otherwise
   */
  #ttlEvict(key: K): boolean {
    if (this.#ttlMap.has(key)) {
      const ttl = this.#ttlMap.get(key);
      if (ttl && Date.now() > ttl) {
        this.#emit(CacheEvent.Eviction, key, this.#map.get(key));
        this.#map.delete(key);
        this.#ttlMap.delete(key);
        if (this.#autoPersist) {
          this.persist();
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Gets the value associated with the key, and updates the cache to reflect
   * the most recently used item (if it exists)
   *
   * @param {K} key - The key to get the value for
   *
   * @returns {V | undefined} - The value associated with the key
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.get("a"); // 1
   * cache.get("b"); // undefined
   */
  get(key: K): V | undefined {
    this.#stats.access += 1;

    if (this.#ttlEvict(key)) {
      this.#stats.miss += 1;
      return undefined;
    }

    const value = this.#map.get(key);
    if (value) {
      this.#map.delete(key);
      this.#map.set(key, value);

      if (this.#ttl) {
        this.#ttlMap.delete(key);
        this.#ttlMap.set(key, Date.now() + this.#ttl);
      }

      if (this.#autoPersist) {
        this.persist();
      }

      this.#stats.hit += 1;
    } else {
      this.#stats.miss += 1;
    }

    return value;
  }

  /**
   * Puts the key-value pair into the cache, and evicts the least recently used
   * item if the cache is full
   *
   * @param {K} key - The key to put the value for
   * @param {V} value - The value to put for the key
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.put("c", 3);
   * cache.get("a"); // undefined
   * cache.get("b"); // 2
   * cache.get("c"); // 3
   */
  put(key: K, value: V): void {
    if (this.#map.has(key)) {
      this.#map.delete(key);
      this.#ttlMap.delete(key);
    } else if (this.size === this.capacity) {
      const key = this.first!;
      this.#emit(CacheEvent.Eviction, key, this.#map.get(key));
      this.#map.delete(key);
      this.#ttlMap.delete(key);
      this.#stats.eviction += 1;
    }

    this.#map.set(key, value);
    if (this.#ttl) {
      this.#ttlMap.set(key, Date.now() + this.#ttl);
    }
    this.#emit(CacheEvent.Insertion, key, value);

    if (this.#autoPersist) {
      this.persist();
    }

    if (this.size === this.capacity) {
      this.#emit(CacheEvent.Full);
    }
  }

  /**
   * Gets the value associated with the key without updating the cache
   *
   * @param {K} key - The key to peek the value for
   *
   * @returns {V | undefined} - The value associated with the key
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.peek("a"); // 1
   * cache.peek("c"); // undefined
   */
  peek(key: K): V | undefined {
    if (this.#ttlEvict(key)) {
      return undefined;
    }

    return this.#map.get(key);
  }

  /**
   * Checks if the key exists in the cache without updating the cache
   *
   * @param {K} key - The key to check for
   *
   * @returns {boolean} - True if the key exists in the cache, false otherwise
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.has("a"); // true
   * cache.has("c"); // false
   */
  has(key: K): boolean {
    if (this.#ttlEvict(key)) {
      return false;
    }

    return this.#map.has(key);
  }

  /**
   * Removes the key-value pair from the cache if it exists
   *
   * @param {K} key - The key to remove
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.remove("a");
   * cache.has("a"); // false
   * cache.has("b"); // true
   * cache.size; // 1
   */
  remove(key: K): void {
    this.#emit(CacheEvent.Removal, key, this.#map.get(key));
    this.#map.delete(key);
    this.#ttlMap.delete(key);

    if (this.#autoPersist) {
      this.persist();
    }

    if (this.size === 0) {
      this.#emit(CacheEvent.Empty);
    }
  }

  /**
   * Clears the cache of all key-value pairs
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.clear();
   * cache.has("a"); // false
   * cache.has("b"); // false
   * cache.size; // 0
   */
  clear(): void {
    if (this.#eventHandlers[CacheEvent.Removal].length > 0) {
      this.#map.forEach((value, key) => {
        this.#emit(CacheEvent.Removal, key, value);
      });
    }

    this.#map.clear();
    this.#ttlMap.clear();

    this.#emit(CacheEvent.Empty);

    if (this.#autoPersist) {
      this.persist();
    }
  }

  /**
   * Clears the cache's internal stats
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * (...)
   * cache.clearStats();
   */
  clearStats(): void {
    this.#stats = {
      hit: 0,
      miss: 0,
      access: 0,
      eviction: 0,
    };
  }

  /**
   * Resizes the cache to the new capacity if the new capacity is greater than
   * 0. If the new capacity is less than the current size of the cache, the
   * least recently used items will be evicted until the size of the cache is
   * equal to the new capacity.
   *
   * @param {number} capacity - The new capacity of the cache
   *
   * @throws {Error} - If capacity is less than 1
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.resize(1);
   * cache.has("a"); // false
   * cache.has("b"); // true
   * cache.size; // 1
   * cache.capacity; // 1
   */
  resize(capacity: number): void {
    if (capacity < 1) {
      throw new Error("Capacity must be greater than 0");
    }

    this.#capacity = capacity;

    while (this.size > this.capacity) {
      const key = this.first!;
      this.#emit(CacheEvent.Eviction, key, this.#map.get(key));
      this.#map.delete(key);
    }

    if (this.#autoPersist) {
      this.persist();
    }
  }

  /**
   * Registers an event handler for the specified cache event
   *
   * @param {CacheEvent} event - The cache event to register the handler for
   * @param {CacheEventHandler<K, V>} callback - The event handler to register
   *
   * @returns {CacheEventCallback} - An object with an unregister method to
   * unregister the event handler
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * const { unregister } = cache.on(CacheEvent.Insertion, (event, item) => {
   *  console.log(event, item);
   * });
   * cache.put("a", 1); // "insertion" { key: "a", value: 1 }
   * unregister();
   * cache.put("b", 2); // (no output)
   */
  on(event: CacheEvent, callback: CacheEventHandler<K, V>): CacheEventCallback {
    if (!this.#eventHandlers[event]) {
      throw new Error(`Invalid event: ${event}`);
    }

    this.#eventHandlers[event].push(callback);

    const unregister = () => {
      this.#eventHandlers[event] = this.#eventHandlers[event].filter(
        (cb) => cb !== callback,
      );
    };

    return { unregister };
  }

  /**
   * Emits a cache event to all registered event handlers
   *
   * @private
   * @param {CacheEvent} event - The cache event to emit
   * @param {K} key - The key associated with the event
   * @param {V} value - The value associated with the event
   */
  #emit(event: CacheEvent, key?: K, value?: V): void {
    this.#eventHandlers[event].forEach((handler) => {
      handler(event, key && value ? { key, value } : undefined);
    });
  }

  /**
   * Persists the cache
   *
   * @throws {Error} - If persistence is not set
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.persist();
   * const persistenceKey = cache.persistence.key;
   */
  persist(): void {
    if (!this.#persistence) {
      throw new Error("Persistence is not set");
    }
    this.#persistence.persist(this.#map);
  }

  /**
   * Restores the cache
   *
   * @throws {Error} - If persistence is not set
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.persist();
   * const persistenceKey = cache.persistence.key;
   * ...
   * const persistence = new LRUCachePersistence<string, number>(persistenceKey);
   * const cache = new LRUCache<string, number>(2, persistence);
   * cache.restore();
   * cache.get("a"); // 1
   * cache.get("b"); // 2
   */
  restore(): void {
    if (!this.#persistence) {
      throw new Error("Persistence is not set");
    }
    this.#map = this.#persistence.restore();
  }

  /**
   * Converts the cache to a Map
   *
   * @returns {Map<K, V>} - The cache as a Map
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.toMap(); // Map { "a" => 1, "b" => 2 }
   */
  toMap(): Map<K, V> {
    return new Map(this.#map);
  }

  /**
   * Gets the first key in the cache
   *
   * @returns {K | undefined} - The first key in the cache
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.first; // "a"
   */
  get first(): K | undefined {
    return this.#map.keys().next().value;
  }

  /**
   * Gets the last key in the cache
   *
   * @returns {K | undefined} - The last key in the cache
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.last; // "b"
   */
  get last(): K | undefined {
    return Array.from(this.#map.keys()).pop();
  }

  /**
   * Gets the number of items in the cache
   *
   * @returns {number} - The number of items in the cache
   *
   * @example
   * const cache = new LRUCache<string, number>(1);
   * cache.put("a", 1);
   * cache.size; // 1
   */
  get size(): number {
    return this.#map.size;
  }

  /**
   * Gets the maximum number of items the cache can hold
   *
   * @returns {number} - The maximum number of items the cache can hold
   *
   * @example
   * const cache = new LRUCache<string, number>(1);
   * cache.capacity; // 1
   */
  get capacity(): number {
    return this.#capacity;
  }

  /**
   * Gets the cache's internal stats
   *
   * @returns {LRUCacheStats} - The cache's internal stats
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.get("a");
   * cache.stats; // { hitRate: 0.5, missRate: 0.5, evictionRate: 0, effectiveness: 0 }
   * cache.put("c", 3);
   * cache.stats; // { hitRate: 0.25, missRate: 0.75, evictionRate: 0.25, effectiveness: 1 }
   */
  get stats(): LRUCacheStats {
    const hitRate = this.#stats.access
      ? this.#stats.hit / this.#stats.access
      : 0;
    const missRate = this.#stats.access
      ? this.#stats.miss / this.#stats.access
      : 0;
    const evictionRate = this.#stats.access
      ? this.#stats.eviction / this.#stats.access
      : 0;
    const effectiveness = this.#stats.hit
      ? this.#stats.eviction / this.#stats.hit
      : 0;

    return {
      hitRate,
      missRate,
      evictionRate,
      effectiveness,
    };
  }

  /**
   * Gets the cache's persistence
   *
   * @returns {LRUCachePersistence<K,V> | undefined} - The cache's persistence
   *
   * @example
   * cache.persistence = new LRUCachePersistence<string, number>("my-cache");
   * const cache = new LRUCache<string, number>(2, persistence);
   * cache.persistence.key; // "my-cache"
   * cache.persistence.isAuto; // false
   */
  get persistence(): LRUCachePersistence<K, V> | undefined {
    return this.#persistence;
  }

  /**
   * Gets whether the cache is auto-persisted (persisted on every change)
   *
   * @returns {boolean}
   *
   * @example
   * const persistence = new LRUCachePersistence<string, number>("my-cache");
   * console.log(persistence.isAuto); // false
   */
  get isAutoPersist(): boolean {
    return Boolean(this.#autoPersist);
  }

  /**
   * Gets the default time-to-live (TTL) for cache items (in ms)
   *
   * @returns {number | undefined} - The default time-to-live (TTL) for cache items (in ms)
   *
   * @example
   * const cache = new LRUCache<string, number>(2, { ttl: 1000 });
   * cache.ttl; // 1000
   */
  get ttl(): number | undefined {
    return this.#ttl;
  }

  /**
   * Sets the cache's persistence
   *
   * @param {LRUCachePersistence<K, V> | undefined} persistence - The cache's persistence
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.persistence = new LRUCachePersistence<string, number>("my-cache");
   * cache.persistence.key; // "my-cache"
   */
  set persistence(persistence: LRUCachePersistence<K, V> | undefined) {
    this.#persistence = persistence;
  }

  /**
   * Sets whether the cache is auto-persisted (persisted on every change)
   *
   * @param {boolean} autoPersist
   *
   * @example
   * const persistence = new LRUCachePersistence<string, number>("my-cache");
   * const cache = new LRUCache<string, number>(2, persistence);
   * console.log(cache.isAutoPersist); // false
   * cache.autoPersist = true;
   * console.log(cache.isAutoPersist); // true
   */
  set autoPersist(autoPersist: boolean) {
    this.#autoPersist = autoPersist;
  }

  /**
   * Sets the default time-to-live (TTL) for cache items (in ms)
   *
   * @param {number | undefined} ttl - The default time-to-live (TTL) for cache items (in ms)
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.ttl = 1000;
   * console.log(cache.ttl); // 1000
   */
  set ttl(ttl: number | undefined) {
    this.#ttl = ttl;
  }
}

/**
 * The cache's internal stats
 *
 * @property {number} hitRate - Hit Rate = (Number of Cache Hits) / (Total Number of Cache Accesses)
 * @property {number} missRate - Miss Rate = (Number of Cache Misses) / (Total Number of Cache Accesses)
 * @property {number} evictionRate - Eviction Rate = (Number of Evictions) / (Total Number of Cache Accesses)
 * @property {number} effectiveness - LRU Policy Effectiveness = (Number of LRU-Based Evictions) / (Total Number of Cache Hits)
 */
export type LRUCacheStats = {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  effectiveness: number;
};

/**
 * The cache event
 *
 * @enum {string}
 *
 * @property {string} Insertion - The event that occurs when a key-value pair is inserted into the cache
 * @property {string} Eviction - The event that occurs when a key-value pair is evicted from the cache
 * @property {string} Removal - The event that occurs when a key-value pair is removed from the cache
 * @property {string} Full - The event that occurs when the cache becomes full
 * @property {string} Empty - The event that occurs when the cache becomes empty
 */
export enum CacheEvent {
  Insertion = "insertion",
  Eviction = "eviction",
  Removal = "removal",
  Full = "full",
  Empty = "empty",
}

/**
 * The event callback
 *
 * @property {Function} unregister - The function to unregister the event handler
 */
export type CacheEventCallback = {
  unregister: () => void;
};

/**
 * The event handler
 *
 * @template K - The key type
 * @template V - The value type
 *
 * @param {CacheEvent} event - The cache event
 * @param {{ key: K; value: V }} [item] - The key-value pair associated with the event
 */
export type CacheEventHandler<K, V> = (
  event: CacheEvent,
  item?: { key: K; value: V },
) => void;

/**
 * An LRU cache persistence implementation
 *
 * @template K - The key type
 * @template V - The value type
 *
 * @param {string} [cacheKey] - The cache key
 * @param {{ persist: (cache: Map<K, V>) => void; restore: () => Map<K, V> }} [logic] - The persistence logic
 *
 * @getter key - Gets the cache key
 * @getter isAuto - Gets whether the cache is auto-persisted (persisted on every change)
 *
 * @method persist - Persists the cache
 * @method restore - Restores the cache
 *
 * @example
 * const persistence = new LRUCachePersistence<string, number>("my-cache");
 * const cache = new Map<string, number>([[ "a", 1 ], [ "b", 2 ]]);
 * persistence.persist(cache);
 * const restoredCache = persistence.restore();
 * console.log(restoredCache); // Map { "a" => 1, "b" => 2 }
 */
export class LRUCachePersistence<K, V> {
  /**
   * @private
   * @type {string} - The cache key
   */
  #cacheKey: string;

  /**
   * Persists the cache
   *
   * @param {Map<K, V>} cache - The cache to persist
   */
  persist: (cache: Map<K, V>) => void = (cache) => {
    localStorage.setItem(
      this.#cacheKey,
      JSON.stringify(
        Array.from(cache.entries()).map(([k, v]) => ({ key: k, value: v })),
      ),
    );
  };

  /**
   * Restores the cache
   *
   * @returns {Map<K, V>}
   */
  restore: () => Map<K, V> = () => {
    const data = localStorage.getItem(this.#cacheKey);
    if (data) {
      return new Map(
        JSON.parse(data).map(({ key, value }: { key: K; value: V }) => [
          key,
          value,
        ]),
      );
    }
    return new Map();
  };

  /**
   * Creates a new LRUCachePersistence
   *
   * @param {string} [cacheKey] - The cache key
   * @param {boolean} [autoPersist] - Whether the cache is auto-persisted (persisted on every change)
   * @param {{ persist: (cache: Map<K, V>) => void; restore: () => Map<K, V> }} [logic] - The persistence logic
   *
   * @example
   * const persistence = new LRUCachePersistence<string, number>("my-cache");
   */
  constructor(
    cacheKey: string = uuidv4(),
    logic?: { persist: (cache: Map<K, V>) => void; restore: () => Map<K, V> },
  ) {
    this.#cacheKey = cacheKey;

    if (logic) {
      this.persist = logic.persist;
      this.restore = logic.restore;
    }
  }

  /**
   * Gets the cache key
   *
   * @returns {string}
   *
   * @example
   * const persistence = new LRUCachePersistence<string, number>("my-cache");
   * console.log(persistence.key); // "my-cache"
   */
  get key(): string {
    return this.#cacheKey;
  }
}

/**
 * A UUIDv4 generator
 * @returns {string} - A UUIDv4 string
 *
 * @example
 * const uuid = uuidv4();
 * console.log(uuid); // "110ec58a-a0f2-4ac4-8393-c866d813b8d1"
 */
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
export { uuidv4 as __test__uuidv4 };

export default LRUCache;

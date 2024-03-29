import { CacheEvent, CacheEventHandler, CacheEventCallback } from "./events";
import { CachePersistence } from "./persistence";

/**
 * A simple cache implementation
 * @class Cache
 *
 * @template K - The key type
 * @template V - The value type
 *
 * @param {number} capacity - The maximum number of items the cache can hold
 * @param {Object} [options] - The cache's persistence and auto-persist settings
 * @property {CachePersistence<K, V>} [persistence] - The cache's persistence
 * @property {boolean} [autoPersist] - Whether the cache is auto-persisted (persisted on every change)
 * @property {number} [ttl] - The default time-to-live (TTL) for cache items (in ms)
 * @property {number} [ttlCleanupInterval] - The interval to cleanup TTL items
 * @property {CacheEvictionPolicy<K, V>} [evictionPolicy] - The cache eviction policy
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
 * @method ttlClearCleanupInterval - Clears the TTL cleanup interval
 * @method ttlCleanupInterval - Sets the default time-to-live (TTL) cleanup interval
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
 * @setter ttlCleanupInterval - Sets the default time-to-live (TTL) cleanup interval
 *
 * @throws {Error} - If capacity is less than 1
 * @throws {Error} - If event being registered is invalid
 * @throws {Error} - If persistence is not set
 * @throws {Error} - If interval is less than 1
 * @throws {Error} - If TTL cleanup interval must be greater than 0
 *
 * @example
 * const cache = new Cache<string, number>(2);
 * cache.put("a", 1);
 * cache.put("b", 2);
 * cache.get("a"); // 1
 * cache.put("c", 3);
 * cache.get("b"); // undefined
 *
 */
export class Cache<K, V> {
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
   * @type {CachePersistence<K, V> | undefined} - The cache's persistence
   */
  #persistence?: CachePersistence<K, V>;

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
   * @type {Map<K, { ttl: number; expiresAt: number }>} - The map that holds the time-to-live (TTL) for
   * cache items
   */
  #ttlMap: Map<K, { ttl: number; expiresAt: number }>;

  /**
   * @private
   * @type {Function | undefined} - The cleanup function for TTL items
   */
  #ttlClearCleanupInterval?: () => void;

  /**
   * @private
   * @type {CacheEvictionPolicy<K, V> | undefined} - The cache eviction policy
   */
  #evictionPolicy: CacheEvictionPolicy<K, V>;

  /**
   * Creates a new Cache
   *
   * @param {number} capacity - The maximum number of items the cache can hold
   * @param {Object} [options] - The cache's persistence and auto-persist settings
   * @property {CachePersistence<K, V>} [persistence] - The cache's persistence
   * @property {boolean} [autoPersist] - Whether the cache is auto-persisted (persisted on every change)
   * @property {number} [ttl] - The default time-to-live (TTL) for cache items (in ms)
   * @property {number} [ttlCleanupInterval] - The interval to cleanup TTL items
   * @property {CacheEvictionPolicy<K, V>} [evictionPolicy] - The cache eviction policy
   *
   * @throws {Error} - If capacity is less than 1
   * @throws {Error} - If TTL cleanup interval must be greater than 0
   *
   * @example
   * const cache = new Cache<string, number>(2);
   * cache.capacity; // 2
   */
  constructor(
    capacity: number,
    {
      persistence,
      autoPersist,
      ttl,
      ttlCleanupInterval,
      evictionPolicy = (cache) => cache.first!,
    }: CacheOptions<K, V> = {},
  ) {
    if (capacity < 1) {
      throw new Error("Capacity must be greater than 0");
    }

    this.#capacity = capacity;
    this.#map = new Map();

    this.#persistence = persistence;
    this.#autoPersist = autoPersist;

    this.#evictionPolicy = evictionPolicy;

    this.#ttl = ttl;
    this.#ttlMap = new Map();
    if (ttlCleanupInterval !== undefined && ttlCleanupInterval < 1) {
      throw new Error("TTL cleanup interval must be greater than 0");
    }
    this.#ttlClearCleanupInterval = this.#ttlSetCleanup(ttlCleanupInterval);
  }

  /**
   * Evicts the cache item if it has expired
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
      if (ttl && Date.now() > ttl.expiresAt) {
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
   * Proactive cleanup of TTL items
   *
   * @private
   *
   * @param {number} interval - The interval to cleanup TTL items
   *
   * @returns {Function | undefined} - The cleanup function
   */
  #ttlSetCleanup(interval: number = 0): (() => void) | undefined {
    if (!interval) {
      return;
    }

    const timeout = setInterval(() => {
      this.#ttlMap.forEach((_, key) => this.#ttlEvict(key));
    }, interval);

    return () => clearInterval(timeout);
  }

  /**
   * Clears the TTL cleanup interval
   *
   * @example
   * const cache = new Cache<string, number>(2, { ttlCleanupInterval: 1000 });
   * cache.ttlClearCleanupInterval();
   */
  ttlClearCleanupInterval(): void {
    return this.#ttlClearCleanupInterval?.();
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
   * const cache = new Cache<string, number>(2);
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
        const ttl = this.#ttlMap.get(key)!.ttl;
        this.#ttlMap.set(key, {
          ttl,
          expiresAt: Date.now() + ttl,
        });
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
   * @param {number} [ttl] - The time-to-live (TTL) for the key-value pair (in ms)
   *
   * @example
   * const cache = new Cache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.put("c", 3);
   * cache.get("a"); // undefined
   * cache.get("b"); // 2
   * cache.get("c"); // 3
   */
  put(key: K, value: V, ttl?: number): void {
    if (this.#map.has(key)) {
      this.#map.delete(key);
      this.#ttlMap.delete(key);
    } else if (this.size === this.capacity) {
      const key = this.#evictionPolicy(this);
      this.#emit(CacheEvent.Eviction, key, this.#map.get(key));
      this.#map.delete(key);
      this.#ttlMap.delete(key);
      this.#stats.eviction += 1;
    }

    this.#map.set(key, value);
    this.#emit(CacheEvent.Insertion, key, value);

    if (ttl) {
      this.#ttlMap.set(key, { ttl, expiresAt: Date.now() + ttl });
    } else if (this.#ttl) {
      this.#ttlMap.set(key, {
        ttl: this.#ttl,
        expiresAt: Date.now() + this.#ttl,
      });
    }

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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(2);
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
      const key = this.#evictionPolicy(this);
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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.persist();
   * const persistenceKey = cache.persistence.key;
   * ...
   * const persistence = new CachePersistence<string, number>(persistenceKey);
   * const cache = new Cache<string, number>(2, persistence);
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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(2);
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
   * const cache = new Cache<string, number>(1);
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
   * const cache = new Cache<string, number>(1);
   * cache.capacity; // 1
   */
  get capacity(): number {
    return this.#capacity;
  }

  /**
   * Gets the cache's internal stats
   *
   * @returns {CacheStats} - The cache's internal stats
   *
   * @example
   * const cache = new Cache<string, number>(2);
   * cache.put("a", 1);
   * cache.put("b", 2);
   * cache.get("a");
   * cache.stats; // { hitRate: 0.5, missRate: 0.5, evictionRate: 0, effectiveness: 0 }
   * cache.put("c", 3);
   * cache.stats; // { hitRate: 0.25, missRate: 0.75, evictionRate: 0.25, effectiveness: 1 }
   */
  get stats(): CacheStats {
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
   * @returns {CachePersistence<K,V> | undefined} - The cache's persistence
   *
   * @example
   * cache.persistence = new CachePersistence<string, number>("my-cache");
   * const cache = new Cache<string, number>(2, persistence);
   * cache.persistence.key; // "my-cache"
   * cache.persistence.isAuto; // false
   */
  get persistence(): CachePersistence<K, V> | undefined {
    return this.#persistence;
  }

  /**
   * Gets whether the cache is auto-persisted (persisted on every change)
   *
   * @returns {boolean}
   *
   * @example
   * const persistence = new CachePersistence<string, number>("my-cache");
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
   * const cache = new Cache<string, number>(2, { ttl: 1000 });
   * cache.ttl; // 1000
   */
  get ttl(): number | undefined {
    return this.#ttl;
  }

  /**
   * Sets the cache's persistence
   *
   * @param {CachePersistence<K, V> | undefined} persistence - The cache's persistence
   *
   * @example
   * const cache = new Cache<string, number>(2);
   * cache.persistence = new CachePersistence<string, number>("my-cache");
   * cache.persistence.key; // "my-cache"
   */
  set persistence(persistence: CachePersistence<K, V> | undefined) {
    this.#persistence = persistence;
  }

  /**
   * Sets whether the cache is auto-persisted (persisted on every change)
   *
   * @param {boolean} autoPersist
   *
   * @example
   * const persistence = new CachePersistence<string, number>("my-cache");
   * const cache = new Cache<string, number>(2, persistence);
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
   * const cache = new Cache<string, number>(2);
   * cache.ttl = 1000;
   * console.log(cache.ttl); // 1000
   */
  set ttl(ttl: number | undefined) {
    this.#ttl = ttl;
  }

  /**
   * Sets the default time-to-live (TTL) cleanup interval
   *
   * @param {number} interval - The interval to cleanup TTL items
   *
   * @throws {Error} - If interval is less than 1
   *
   * @example
   * const cache = new Cache<string, number>(2);
   * cache.ttlCleanupInterval = 1000;
   * console.log(cache.ttlCleanupInterval); // 1000
   */
  set ttlCleanupInterval(interval: number) {
    this.ttlClearCleanupInterval();

    if (!interval) {
      this.#ttlClearCleanupInterval = undefined;
      return;
    }
    if (interval < 1) {
      throw new Error("TTL cleanup interval must be greater than 0");
    }

    this.#ttlClearCleanupInterval = this.#ttlSetCleanup(interval);
  }
}

/**
 * A cache eviction policy
 *
 * @template K - The key type
 * @template V - The value type
 *
 * @param {Cache<K, V>} cache - The cache
 *
 * @returns {K} - The key to evict
 *
 * @example
 * const policy: CacheEvictionPolicy<string, number> = (cache) => cache.first!;
 * const cache = new Cache<string, number>(2, { evictionPolicy: policy });
 * cache.put("a", 1);
 * cache.put("b", 2);
 * cache.put("c", 3);
 * cache.get("a"); // undefined
 */
export type CacheEvictionPolicy<K, V> = (cache: Cache<K, V>) => K;

/**
 * Cache options
 *
 * @template K - The key type
 * @template V - The value type
 *
 * @property {CachePersistence<K, V>} [persistence] - The cache's persistence
 * @property {boolean} [autoPersist] - Whether the cache is auto-persisted (persisted on every change)
 * @property {number} [ttl] - The default time-to-live (TTL) for cache items (in ms)
 * @property {number} [ttlCleanupInterval] - The interval to cleanup TTL items
 * @property {CacheEvictionPolicy<K, V>} [evictionPolicy] - The cache eviction policy
 */
export type CacheOptions<K, V> = {
  persistence?: CachePersistence<K, V>;
  autoPersist?: boolean;
  ttl?: number;
  ttlCleanupInterval?: number;
  evictionPolicy?: CacheEvictionPolicy<K, V>;
};

/**
 * The cache's internal stats
 *
 * @property {number} hitRate - Hit Rate = (Number of Cache Hits) / (Total Number of Cache Accesses)
 * @property {number} missRate - Miss Rate = (Number of Cache Misses) / (Total Number of Cache Accesses)
 * @property {number} evictionRate - Eviction Rate = (Number of Evictions) / (Total Number of Cache Accesses)
 * @property {number} effectiveness - Policy Effectiveness = (Number of Policy Evictions) / (Total Number of Cache Hits)
 */
export type CacheStats = {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  effectiveness: number;
};

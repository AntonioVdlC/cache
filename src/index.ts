/**
 * A simple LRU cache implementation
 * @class LRUCache
 *
 * @template K - The key type
 * @template V - The value type
 *
 * @method get - Gets the value associated with the key
 * @method put - Puts the key-value pair into the cache
 * @method peek - Gets the value associated with the key without updating the cache
 * @method has - Checks if the key exists in the cache
 * @method remove - Removes the key-value pair from the cache
 * @method clear - Clears the cache
 * @method clearStats - Clears the cache's internal stats
 * @method resize - Resizes the cache
 *
 * @getter first - Gets the first key in the cache
 * @getter last - Gets the last key in the cache
 * @getter size - Gets the number of items in the cache
 * @getter capacity - Gets the maximum number of items the cache can hold
 * @getter stats - Gets the cache's internal stats
 *
 * @throws {Error} - If capacity is less than 1
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
   * Creates a new LRUCache
   *
   * @param {number} capacity - The maximum number of items the cache can hold
   *
   * @throws {Error} - If capacity is less than 1
   *
   * @example
   * const cache = new LRUCache<string, number>(2);
   * cache.capacity; // 2
   */
  constructor(capacity: number) {
    if (capacity < 1) {
      throw new Error("Capacity must be greater than 0");
    }

    this.#capacity = capacity;
    this.#map = new Map();
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
    const value = this.#map.get(key);
    if (value) {
      this.#map.delete(key);
      this.#map.set(key, value);

      this.#stats.hit += 1;
    } else {
      this.#stats.miss += 1;
    }

    this.#stats.access += 1;

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
    } else if (this.size === this.capacity) {
      this.#map.delete(this.first!);
      this.#stats.eviction += 1;
    }

    this.#map.set(key, value);
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
    this.#map.delete(key);
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
    this.#map.clear();
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
      this.#map.delete(this.first!);
    }
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
}

/**
 * The cache's internal stats
 *
 * @property {number} hitRate - Hit Rate = (Number of Cache Hits) / (Total Number of Cache Accesses)
 * @property {number} missRate - Miss Rate = (Number of Cache Misses) / (Total Number of Cache Accesses)
 * @property {number} evictionRate - Eviction Rate = (Number of Evictions) / (Total Number of Cache Accesses)
 * @property {number} effectiveness - LRU Policy Effectiveness = (Number of LRU-Based Evictions) / (Total Number of Cache Hits)
 */
type LRUCacheStats = {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  effectiveness: number;
};

export default LRUCache;

import { uuidv4 } from "./utils/uuid";

/**
 * A cache persistence implementation
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
 * const persistence = new CachePersistence<string, number>("my-cache");
 * const cache = new Map<string, number>([[ "a", 1 ], [ "b", 2 ]]);
 * persistence.persist(cache);
 * const restoredCache = persistence.restore();
 * console.log(restoredCache); // Map { "a" => 1, "b" => 2 }
 */
export class CachePersistence<K, V> {
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
   * Creates a new CachePersistence
   *
   * @param {string} [cacheKey] - The cache key
   * @param {boolean} [autoPersist] - Whether the cache is auto-persisted (persisted on every change)
   * @param {{ persist: (cache: Map<K, V>) => void; restore: () => Map<K, V> }} [logic] - The persistence logic
   *
   * @example
   * const persistence = new CachePersistence<string, number>("my-cache");
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
   * const persistence = new CachePersistence<string, number>("my-cache");
   * console.log(persistence.key); // "my-cache"
   */
  get key(): string {
    return this.#cacheKey;
  }
}

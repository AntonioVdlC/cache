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

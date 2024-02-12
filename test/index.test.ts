import { describe, it, expect, vi, beforeEach } from "vitest";

import LRUCache, { CacheEvent } from "../src";

describe("LRUCache", () => {
  describe("constructor", () => {
    it("should be a class", () => {
      expect(typeof LRUCache).toBe("function");
    });
    it("should be instantiable", () => {
      const cache = new LRUCache<string, number>(1);
      expect(cache).toBeInstanceOf(LRUCache);
    });
    it("should throw an error if capacity is less than 1", () => {
      expect(() => new LRUCache<string, number>(0)).toThrow(
        "Capacity must be greater than 0",
      );
    });
  });

  describe("getters", () => {
    describe("first", () => {
      it("should return the first key in the cache", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
      });
      it("should return undefined if cache is empty", () => {
        const cache = new LRUCache<string, number>(1);
        expect(cache.first).toBe(undefined);
      });
    });

    describe("last", () => {
      it("should return the last key in the cache", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.last).toBe("b");
      });
      it("should return undefined if cache is empty", () => {
        const cache = new LRUCache<string, number>(1);
        expect(cache.last).toBe(undefined);
      });
    });

    describe("size", () => {
      it("should return the size of the cache (empty)", () => {
        const cache = new LRUCache<string, number>(1);
        expect(cache.size).toBe(0);
      });
      it("should return the size of the cache", () => {
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        expect(cache.size).toBe(1);
      });
    });

    describe("capacity", () => {
      it("should return the capacity of the cache", () => {
        const cache = new LRUCache<string, number>(1);
        expect(cache.capacity).toBe(1);
      });
    });

    describe("stats", () => {
      it("should return basic stats of the cache", () => {
        const cache = new LRUCache<string, number>(1);

        expect(Object.keys(cache.stats)).toStrictEqual([
          "hitRate",
          "missRate",
          "evictionRate",
          "effectiveness",
        ]);
      });
      it("should initialise stats to 0", () => {
        const cache = new LRUCache<string, number>(1);

        expect(cache.stats.hitRate).toBe(0);
        expect(cache.stats.missRate).toBe(0);
        expect(cache.stats.evictionRate).toBe(0);
        expect(cache.stats.effectiveness).toBe(0);
      });
      it("should properly calculate hit rate", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.stats.hitRate).toBe(0);

        cache.get("a");
        expect(cache.stats.hitRate).toBe(1);

        cache.get("c"); // Miss
        expect(cache.stats.hitRate).toBe(0.5);
      });
      it("should properly calculate miss rate", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.stats.missRate).toBe(0);

        cache.get("a");
        expect(cache.stats.missRate).toBe(0);

        cache.get("c"); // Miss
        expect(cache.stats.missRate).toBe(0.5);
      });
      it("should properly calculate eviction rate", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.stats.evictionRate).toBe(0);

        cache.get("a");
        expect(cache.stats.evictionRate).toBe(0);

        cache.put("c", 3);
        expect(cache.stats.evictionRate).toBe(1);

        cache.get("b"); // Miss
        expect(cache.stats.evictionRate).toBe(0.5);
      });
      it("should properly calculate effectiveness", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.stats.effectiveness).toBe(0);

        cache.get("a");
        expect(cache.stats.effectiveness).toBe(0);

        cache.put("c", 3);
        expect(cache.stats.effectiveness).toBe(1);

        cache.get("b"); // Miss
        expect(cache.stats.effectiveness).toBe(1);

        cache.get("c");
        expect(cache.stats.effectiveness).toBe(0.5);
      });
    });
  });

  describe("methods", () => {
    describe("get", () => {
      it("should return undefined if key does not exist", () => {
        const cache = new LRUCache<string, number>(1);
        expect(cache.get("a")).toBe(undefined);
      });

      it("should return the value if key exists", () => {
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        expect(cache.get("a")).toBe(1);
      });

      it("should move the key to the end of the cache", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.get("a");
        expect(cache.last).toBe("a");
      });

      it("shouldn't move the key if element is not in the cache", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.get("c");
        expect(cache.first).toBe("a");
      });
    });

    describe("put", () => {
      it("should add a new key/value pair to the cache", () => {
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        expect(cache.size).toBe(1);
        expect(cache.get("a")).toBe(1);
      });

      it("should update the value of an existing key", () => {
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        expect(cache.size).toBe(1);
        expect(cache.get("a")).toBe(1);
        cache.put("a", 2);
        expect(cache.size).toBe(1);
        expect(cache.get("a")).toBe(2);
      });

      it("should move the key to the end of the cache", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.put("a", 1);
        expect(cache.last).toBe("a");
      });

      it("should remove the least recently used key if cache is full", () => {
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.get("a")).toBe(undefined);
      });
    });

    describe("peek", () => {
      it("should return undefined if key does not exist", () => {
        const cache = new LRUCache<string, number>(1);
        expect(cache.peek("a")).toBe(undefined);
      });

      it("should return the value if key exists", () => {
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        expect(cache.peek("a")).toBe(1);
      });

      it("should not move the key to the end of the cache", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.peek("a");
        expect(cache.first).toBe("a");
      });
    });

    describe("has", () => {
      it("should return false if key does not exist", () => {
        const cache = new LRUCache<string, number>(1);
        expect(cache.has("a")).toBe(false);
      });

      it("should return true if key exists", () => {
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        expect(cache.has("a")).toBe(true);
      });

      it("should not move the key to the end of the cache", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.has("a");
        expect(cache.first).toBe("a");
      });
    });

    describe("remove", () => {
      it("should remove the key from the cache", () => {
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        expect(cache.has("a")).toBe(true);
        expect(cache.size).toBe(1);
        cache.remove("a");
        expect(cache.has("a")).toBe(false);
        expect(cache.size).toBe(0);
      });

      it("should not throw an error if key does not exist", () => {
        const cache = new LRUCache<string, number>(1);
        expect(() => cache.remove("a")).not.toThrow();
      });
    });

    describe("clear", () => {
      it("should clear the cache", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.size).toBe(2);
        cache.clear();
        expect(cache.has("a")).toBe(false);
        expect(cache.has("b")).toBe(false);
        expect(cache.size).toBe(0);
        expect(cache.capacity).toBe(2);
      });
    });

    describe("clearStats", () => {
      it("should reset the stats", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.get("a");
        cache.get("c");
        cache.put("c", 3);

        expect(cache.stats.hitRate).not.toBe(0);
        expect(cache.stats.missRate).not.toBe(0);
        expect(cache.stats.evictionRate).not.toBe(0);
        expect(cache.stats.effectiveness).not.toBe(0);

        cache.clearStats();

        expect(cache.stats.hitRate).toBe(0);
        expect(cache.stats.missRate).toBe(0);
        expect(cache.stats.evictionRate).toBe(0);
        expect(cache.stats.effectiveness).toBe(0);
      });
    });

    describe("resize", () => {
      it("should update the capacity of the cache", () => {
        const cache = new LRUCache<string, number>(1);
        expect(cache.capacity).toBe(1);
        cache.resize(2);
        expect(cache.capacity).toBe(2);
      });
      it("should throw an error if capacity is less than 1", () => {
        const cache = new LRUCache<string, number>(1);
        expect(() => cache.resize(0)).toThrow(
          "Capacity must be greater than 0",
        );
      });
      it("should remove the least recently used keys if capacity is less than size", () => {
        const cache = new LRUCache<string, number>(3);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.put("c", 3);
        cache.resize(1);
        expect(cache.has("a")).toBe(false);
        expect(cache.has("b")).toBe(false);
        expect(cache.has("c")).toBe(true);
      });
      it("should not remove the least recently used keys if capacity is greater than size", () => {
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.resize(3);
        expect(cache.has("a")).toBe(true);
        expect(cache.has("b")).toBe(true);
      });
    });
    describe("on", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });

      it("should throw an error if event is not supported", () => {
        const cache = new LRUCache<string, number>(1);
        // @ts-expect-error - Testing invalid event
        expect(() => cache.on("foo", () => {})).toThrow("Invalid event: foo");
      });
      it("should add an event listener", () => {
        const cache = new LRUCache<string, number>(1);
        const listener = vi.fn();
        cache.on(CacheEvent.Insertion, listener);
        cache.put("a", 1);
        expect(listener).toHaveBeenCalledWith(CacheEvent.Insertion, {
          key: "a",
          value: 1,
        });
      });
      it("should remove an event listener", () => {
        const cache = new LRUCache<string, number>(2);
        const listener = vi.fn();
        const { unregister } = cache.on(CacheEvent.Insertion, listener);
        cache.put("a", 1);
        expect(listener).toHaveBeenCalledWith(CacheEvent.Insertion, {
          key: "a",
          value: 1,
        });
        unregister();
        cache.put("b", 2);
        expect(listener).toHaveBeenCalledOnce();
      });
      it("should emit an event for every insertion", () => {
        const cache = new LRUCache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Insertion, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(listener).toHaveBeenCalledWith(CacheEvent.Insertion, {
          key: "a",
          value: 1,
        });
        expect(listener).toHaveBeenCalledWith(CacheEvent.Insertion, {
          key: "b",
          value: 2,
        });
      });
      it("should emit an event for every removal", () => {
        const cache = new LRUCache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Removal, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.remove("a");
        expect(listener).toHaveBeenCalledWith(CacheEvent.Removal, {
          key: "a",
          value: 1,
        });
      });
      it("should emit an event for every removal during clear()", () => {
        const cache = new LRUCache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Removal, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.clear();
        expect(listener).toHaveBeenCalledWith(CacheEvent.Removal, {
          key: "a",
          value: 1,
        });
        expect(listener).toHaveBeenCalledWith(CacheEvent.Removal, {
          key: "b",
          value: 2,
        });
      });
      it("should emit an event for every eviction", () => {
        const cache = new LRUCache<string, number>(1);
        const listener = vi.fn();
        cache.on(CacheEvent.Eviction, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(listener).toHaveBeenCalledWith(CacheEvent.Eviction, {
          key: "a",
          value: 1,
        });
      });
      it("should emit an event for every eviction during resize()", () => {
        const cache = new LRUCache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Eviction, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.resize(1);
        expect(listener).toHaveBeenCalledWith(CacheEvent.Eviction, {
          key: "a",
          value: 1,
        });
      });
      it("should emit an event when cache is full", () => {
        const cache = new LRUCache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Full, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(listener).toHaveBeenCalledOnce();
      });
      it("should emit an event when cache is empty", () => {
        const cache = new LRUCache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Empty, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.remove("a");
        cache.remove("b");
        expect(listener).toHaveBeenCalledOnce();
      });
      it("should emit an event when cache is empty after clear()", () => {
        const cache = new LRUCache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Empty, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.clear();
        expect(listener).toHaveBeenCalledOnce();
      });
    });
  });
});

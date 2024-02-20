import { describe, it, expect, vi, beforeEach } from "vitest";

import { Cache, CacheEvent, CachePersistence } from "../src";

import type { CacheOptions } from "../src";

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal("localStorage", localStorageMock);

/**
 * Helper function to create a delay
 *
 * @param ms - The number of milliseconds to wait
 *
 * @returns A promise that resolves after the specified time
 *
 * @example
 * await _for(1000);
 * console.log("1 second has passed");
 */
function _for(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Cache", () => {
  describe("constructor", () => {
    it("should be a class", () => {
      expect(typeof Cache).toBe("function");
    });
    it("should be instantiable", () => {
      const cache = new Cache<string, number>(1);
      expect(cache).toBeInstanceOf(Cache);
    });
    it("should throw an error if capacity is less than 1", () => {
      expect(() => new Cache<string, number>(0)).toThrow(
        "Capacity must be greater than 0",
      );
    });
  });

  describe("getters", () => {
    describe("first", () => {
      it("should return the first key in the cache", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
      });
      it("should return undefined if cache is empty", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.first).toBe(undefined);
      });
    });

    describe("last", () => {
      it("should return the last key in the cache", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.last).toBe("b");
      });
      it("should return undefined if cache is empty", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.last).toBe(undefined);
      });
    });

    describe("size", () => {
      it("should return the size of the cache (empty)", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.size).toBe(0);
      });
      it("should return the size of the cache", () => {
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        expect(cache.size).toBe(1);
      });
    });

    describe("capacity", () => {
      it("should return the capacity of the cache", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.capacity).toBe(1);
      });
    });

    describe("stats", () => {
      it("should return basic stats of the cache", () => {
        const cache = new Cache<string, number>(1);

        expect(Object.keys(cache.stats)).toStrictEqual([
          "hitRate",
          "missRate",
          "evictionRate",
          "effectiveness",
        ]);
      });
      it("should initialise stats to 0", () => {
        const cache = new Cache<string, number>(1);

        expect(cache.stats.hitRate).toBe(0);
        expect(cache.stats.missRate).toBe(0);
        expect(cache.stats.evictionRate).toBe(0);
        expect(cache.stats.effectiveness).toBe(0);
      });
      it("should properly calculate hit rate", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.stats.hitRate).toBe(0);

        cache.get("a");
        expect(cache.stats.hitRate).toBe(1);

        cache.get("c"); // Miss
        expect(cache.stats.hitRate).toBe(0.5);
      });
      it("should properly calculate miss rate", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.stats.missRate).toBe(0);

        cache.get("a");
        expect(cache.stats.missRate).toBe(0);

        cache.get("c"); // Miss
        expect(cache.stats.missRate).toBe(0.5);
      });
      it("should properly calculate eviction rate", () => {
        const cache = new Cache<string, number>(2);
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
        const cache = new Cache<string, number>(2);
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
    describe("persistence", () => {
      it("should return undefined if persistence is not set", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.persistence).toBe(undefined);
      });
      it("should return the persistence", () => {
        const persistence = new CachePersistence<string, number>("foo");
        const cache = new Cache<string, number>(1, { persistence });
        expect(cache.persistence).toBe(persistence);
      });
    });
    describe("isAutoPersist", () => {
      it("should return false if not set", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.isAutoPersist).toBe(false);
      });
      it.each([
        [true, true],
        [false, false],
      ])("should return the value if set", (autoPersist, expected) => {
        const persistence = new CachePersistence<string, number>("foo");
        const cache = new Cache<string, number>(1, {
          persistence,
          autoPersist,
        });
        expect(cache.isAutoPersist).toBe(expected);
      });
    });
    describe("ttl", () => {
      it("should return undefined if not set", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.ttl).toBe(undefined);
      });
      it("should return the value if set", () => {
        const cache = new Cache<string, number>(1, { ttl: 1000 });
        expect(cache.ttl).toBe(1000);
      });
    });
  });

  describe("setters", () => {
    describe("persistence", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should set the persistence", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(1);
        expect(() => cache.persist()).toThrow("Persistence is not set");
        expect(logic.persist).not.toHaveBeenCalled();
        cache.persistence = persistence;
        cache.persist();
        expect(logic.persist).toHaveBeenCalled();
      });
    });
    describe("autoPersist", () => {
      it("should set the value", () => {
        const cache = new Cache<string, number>(1);
        cache.autoPersist = true;
        expect(cache.isAutoPersist).toBe(true);
      });
      it("should default to false", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.isAutoPersist).toBe(false);
      });
    });
    describe("ttl", () => {
      it("should set the value", () => {
        const cache = new Cache<string, number>(1);
        cache.ttl = 1000;
        expect(cache.ttl).toBe(1000);
      });
      it("should default to undefined", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.ttl).toBe(undefined);
      });
    });
  });

  describe("methods", () => {
    describe("get", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should return undefined if key does not exist", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.get("a")).toBe(undefined);
      });
      it("should return the value if key exists", () => {
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        expect(cache.get("a")).toBe(1);
      });
      it("should move the key to the end of the cache", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.get("a");
        expect(cache.last).toBe("a");
      });
      it("shouldn't move the key if element is not in the cache", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.get("c");
        expect(cache.first).toBe("a");
      });
      it("should persist the cache if auto-persist is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        cache.persistence = persistence;
        cache.autoPersist = true;
        cache.get("a");
        expect(logic.persist).toHaveBeenCalledWith(new Map([["a", 1]]));
      });
      it("should not persist the cache if auto-persist is not set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        cache.persistence = persistence;
        cache.get("a");
        expect(logic.persist).not.toHaveBeenCalledWith();
      });
    });

    describe("put", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should add a new key/value pair to the cache", () => {
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        expect(cache.size).toBe(1);
        expect(cache.get("a")).toBe(1);
      });
      it("should update the value of an existing key", () => {
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        expect(cache.size).toBe(1);
        expect(cache.get("a")).toBe(1);
        cache.put("a", 2);
        expect(cache.size).toBe(1);
        expect(cache.get("a")).toBe(2);
      });
      it("should move the key to the end of the cache", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.put("a", 1);
        expect(cache.last).toBe("a");
      });
      it("should remove the least recently used key if cache is full", () => {
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.get("a")).toBe(undefined);
      });
      it("should persist the cache if auto-persist is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(1, {
          persistence,
          autoPersist: true,
        });
        cache.put("a", 1);
        expect(logic.persist).toHaveBeenCalledWith(new Map([["a", 1]]));
      });
      it("should not persist the cache if auto-persist is not set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(1, { persistence });
        cache.put("a", 1);
        expect(logic.persist).not.toHaveBeenCalledWith();
      });
    });

    describe("peek", () => {
      it("should return undefined if key does not exist", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.peek("a")).toBe(undefined);
      });
      it("should return the value if key exists", () => {
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        expect(cache.peek("a")).toBe(1);
      });
      it("should not move the key to the end of the cache", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.peek("a");
        expect(cache.first).toBe("a");
      });
    });

    describe("has", () => {
      it("should return false if key does not exist", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.has("a")).toBe(false);
      });
      it("should return true if key exists", () => {
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        expect(cache.has("a")).toBe(true);
      });
      it("should not move the key to the end of the cache", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.first).toBe("a");
        cache.has("a");
        expect(cache.first).toBe("a");
      });
    });

    describe("remove", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should remove the key from the cache", () => {
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        expect(cache.has("a")).toBe(true);
        expect(cache.size).toBe(1);
        cache.remove("a");
        expect(cache.has("a")).toBe(false);
        expect(cache.size).toBe(0);
      });
      it("should not throw an error if key does not exist", () => {
        const cache = new Cache<string, number>(1);
        expect(() => cache.remove("a")).not.toThrow();
      });
      it("should persist the cache if auto-persist is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.persistence = persistence;
        cache.autoPersist = true;
        cache.remove("a");
        expect(logic.persist).toHaveBeenCalledWith(new Map([["b", 2]]));
      });
      it("should not persist the cache if auto-persist is not set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        cache.persistence = persistence;
        cache.remove("a");
        expect(logic.persist).not.toHaveBeenCalledWith();
      });
    });

    describe("clear", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should clear the cache", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.size).toBe(2);
        cache.clear();
        expect(cache.has("a")).toBe(false);
        expect(cache.has("b")).toBe(false);
        expect(cache.size).toBe(0);
        expect(cache.capacity).toBe(2);
      });
      it("should persist the cache if auto-persist is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        cache.persistence = persistence;
        cache.autoPersist = true;
        cache.clear();
        expect(logic.persist).toHaveBeenCalledWith(new Map());
      });
      it("should not persist the cache if auto-persist is not set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(1);
        cache.put("a", 1);
        cache.persistence = persistence;
        cache.clear();
        expect(logic.persist).not.toHaveBeenCalledWith();
      });
    });

    describe("clearStats", () => {
      it("should reset the stats", () => {
        const cache = new Cache<string, number>(2);
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
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should update the capacity of the cache", () => {
        const cache = new Cache<string, number>(1);
        expect(cache.capacity).toBe(1);
        cache.resize(2);
        expect(cache.capacity).toBe(2);
      });
      it("should throw an error if capacity is less than 1", () => {
        const cache = new Cache<string, number>(1);
        expect(() => cache.resize(0)).toThrow(
          "Capacity must be greater than 0",
        );
      });
      it("should remove the least recently used keys if capacity is less than size", () => {
        const cache = new Cache<string, number>(3);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.put("c", 3);
        cache.resize(1);
        expect(cache.has("a")).toBe(false);
        expect(cache.has("b")).toBe(false);
        expect(cache.has("c")).toBe(true);
      });
      it("should not remove the least recently used keys if capacity is greater than size", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.resize(3);
        expect(cache.has("a")).toBe(true);
        expect(cache.has("b")).toBe(true);
      });
      it("should persist the cache if auto-persist is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.persistence = persistence;
        cache.autoPersist = true;
        cache.resize(1);
        expect(logic.persist).toHaveBeenCalledWith(new Map([["b", 2]]));
      });
      it("should not persist the cache if auto-persist is not set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.persistence = persistence;
        cache.resize(1);
        expect(logic.persist).not.toHaveBeenCalledWith();
      });
    });

    describe("on", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });

      it("should throw an error if event is not supported", () => {
        const cache = new Cache<string, number>(1);
        // @ts-expect-error - Testing invalid event
        expect(() => cache.on("foo", () => {})).toThrow("Invalid event: foo");
      });
      it("should add an event listener", () => {
        const cache = new Cache<string, number>(1);
        const listener = vi.fn();
        cache.on(CacheEvent.Insertion, listener);
        cache.put("a", 1);
        expect(listener).toHaveBeenCalledWith(CacheEvent.Insertion, {
          key: "a",
          value: 1,
        });
      });
      it("should add multiple event listeners", () => {
        const cache = new Cache<string, number>(1);
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        cache.on(CacheEvent.Insertion, listener1);
        cache.on(CacheEvent.Insertion, listener2);
        cache.put("a", 1);
        expect(listener1).toHaveBeenCalledWith(CacheEvent.Insertion, {
          key: "a",
          value: 1,
        });
        expect(listener2).toHaveBeenCalledWith(CacheEvent.Insertion, {
          key: "a",
          value: 1,
        });
      });
      it("should remove an event listener", () => {
        const cache = new Cache<string, number>(2);
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
        const cache = new Cache<string, number>(2);
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
        const cache = new Cache<string, number>(2);
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
        const cache = new Cache<string, number>(2);
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
        const cache = new Cache<string, number>(1);
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
        const cache = new Cache<string, number>(2);
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
        const cache = new Cache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Full, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(listener).toHaveBeenCalledOnce();
      });
      it("should emit an event when cache is empty", () => {
        const cache = new Cache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Empty, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.remove("a");
        cache.remove("b");
        expect(listener).toHaveBeenCalledOnce();
      });
      it("should emit an event when cache is empty after clear()", () => {
        const cache = new Cache<string, number>(2);
        const listener = vi.fn();
        cache.on(CacheEvent.Empty, listener);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.clear();
        expect(listener).toHaveBeenCalledOnce();
      });
    });

    describe("persist", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should throw an error if persistence is not set", () => {
        const cache = new Cache<string, number>(1);
        expect(() => cache.persist()).toThrow("Persistence is not set");
      });
      it("should persist the cache", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(2, { persistence });
        cache.put("a", 1);
        cache.put("b", 2);
        cache.persist();
        expect(persistence.persist).toHaveBeenCalledWith(
          new Map([
            ["a", 1],
            ["b", 2],
          ]),
        );
      });
    });

    describe("restore", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should throw an error if persistence is not set", () => {
        const cache = new Cache<string, number>(1);
        expect(() => cache.restore()).toThrow("Persistence is not set");
      });
      it("should restore the cache", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        logic.restore.mockReturnValue(
          new Map([
            ["a", 1],
            ["b", 2],
          ]),
        );
        const cache = new Cache<string, number>(2, { persistence });
        cache.restore();
        expect(persistence.restore).toHaveBeenCalled();
        expect(cache.has("a")).toBe(true);
        expect(cache.has("b")).toBe(true);
      });
      it("should override the existing cache", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        logic.restore.mockReturnValue(
          new Map([
            ["a", 1],
            ["b", 2],
          ]),
        );
        const cache = new Cache<string, number>(2, { persistence });
        cache.put("c", 3);
        cache.restore();
        expect(cache.has("a")).toBe(true);
        expect(cache.has("b")).toBe(true);
        expect(cache.has("c")).toBe(false);
      });
      it("should restore an empty map if no data", () => {
        const persistence = new CachePersistence<string, number>("foo");
        localStorageMock.getItem.mockReturnValue(null);
        const cache = new Cache<string, number>(2, { persistence });
        cache.restore();
        expect(cache.size).toBe(0);
      });
    });

    describe("toMap", () => {
      it("should return a map of the cache", () => {
        const cache = new Cache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        expect(cache.toMap()).toStrictEqual(
          new Map([
            ["a", 1],
            ["b", 2],
          ]),
        );
      });
      it("should return an empty map if cache is empty", () => {
        const cache = new Cache<string, number>(2);
        expect(cache.toMap()).toStrictEqual(new Map());
      });
      it("shouldn't update the cache if the map is modified", () => {
        const cache = new Cache<string, number>(2);
        const map = cache.toMap();
        map.set("a", 1);
        expect(cache.has("a")).toBe(false);
      });
      it("shouldn't update the map if the cache is modified", () => {
        const cache = new Cache<string, number>(2);
        const map = cache.toMap();
        cache.put("a", 1);
        expect(map.has("a")).toBe(false);
      });
    });
  });

  describe("ttl", () => {
    describe("reactive", () => {
      it("should remove the key after the specified time if accessed", async () => {
        const cache = new Cache<string, number>(1, { ttl: 100 });
        cache.put("a", 1);
        expect(cache.has("a")).toBe(true);
        await _for(50);
        cache.get("a");
        await _for(50);
        expect(cache.has("a")).toBe(true);
        await _for(100);
        expect(cache.get("a")).toBe(undefined);
      });
      it("should remove the key after the specified time if .peek() is called", async () => {
        const cache = new Cache<string, number>(1, { ttl: 100 });
        cache.put("a", 1);
        expect(cache.has("a")).toBe(true);
        await _for(50);
        cache.peek("a");
        await _for(70);
        // NOTE: peek() doesn't reset the timer
        expect(cache.peek("a")).toBe(undefined);
      });
      it("should remove the key after the specified time if .has() is called", async () => {
        const cache = new Cache<string, number>(1, { ttl: 100 });
        cache.put("a", 1);
        expect(cache.has("a")).toBe(true);
        await _for(50);
        cache.has("a");
        await _for(70);
        // NOTE: has() doesn't reset the timer
        expect(cache.has("a")).toBe(false);
      });
      it("should persist the cache if auto-persist is set", async () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new CachePersistence<string, number>("foo", logic);
        const cache = new Cache<string, number>(2, {
          ttl: 100,
        });
        cache.put("a", 1);
        await _for(50);
        cache.put("b", 2);
        await _for(70);
        cache.persistence = persistence;
        cache.autoPersist = true;
        cache.get("a");
        expect(logic.persist).toHaveBeenCalledWith(new Map([["b", 2]]));
      });
    });

    describe("proactive", () => {
      it("should not automatically remove the key after the specified time if ttl clean interval is not set", async () => {
        const cache = new Cache<string, number>(1, { ttl: 50 });
        cache.put("a", 1);
        await _for(100);
        expect(cache.size).toBe(1);
      });
      it("should throw an error if ttl cleanup interval is less than 1", () => {
        expect(() => {
          new Cache<string, number>(1, { ttl: 100, ttlCleanupInterval: 0 });
        }).toThrow("TTL cleanup interval must be greater than 0");
      });
      it("should automatically evict the key if ttl cleanup interval is set", async () => {
        const cache = new Cache<string, number>(1, {
          ttl: 50,
          ttlCleanupInterval: 100,
        });
        cache.put("a", 1);
        await _for(150);
        expect(cache.size).toBe(0);
      });

      describe("methods", () => {
        describe("ttlClearCleanupInterval", () => {
          it("should clear the interval if ttlClearCleanupInterval is called", async () => {
            const cache = new Cache<string, number>(1, {
              ttl: 50,
              ttlCleanupInterval: 100,
            });
            cache.put("a", 1);
            await _for(150);
            expect(cache.size).toBe(0);
            await _for(10);
            cache.put("b", 2);
            cache.ttlClearCleanupInterval();
            await _for(150);
            expect(cache.size).toBe(1);
          });
        });
      });

      describe("setters", () => {
        describe("ttlCleanupInterval", () => {
          it("should throw an error if ttlCleanupInterval is negative", () => {
            const cache = new Cache<string, number>(1, { ttl: 100 });
            expect(() => {
              cache.ttlCleanupInterval = -1;
            }).toThrow("TTL cleanup interval must be greater than 0");
          });
          it("should unset the interval if setter ttlCleanupInterval is passed 0", async () => {
            const cache = new Cache<string, number>(1, {
              ttl: 50,
              ttlCleanupInterval: 100,
            });
            cache.put("a", 1);
            await _for(150);
            expect(cache.size).toBe(0);
            await _for(10);
            cache.put("b", 2);
            cache.ttlCleanupInterval = 0;
            await _for(150);
            expect(cache.size).toBe(1);
          });
          it("should update the interval if setter ttlCleanupInterval is called", async () => {
            const cache = new Cache<string, number>(1, {
              ttl: 50,
              ttlCleanupInterval: 100,
            });
            cache.put("a", 1);
            await _for(150);
            expect(cache.size).toBe(0);
            await _for(10);
            cache.put("b", 2);
            cache.ttlCleanupInterval = 200;
            await _for(150);
            expect(cache.size).toBe(1);
          });
        });
      });
    });
    describe("put", () => {
      it("should set a custom ttl if passed", async () => {
        const cache = new Cache<string, number>(2, { ttl: 100 });
        cache.put("a", 1, 50);
        cache.put("b", 2);
        expect(cache.has("a")).toBe(true);
        expect(cache.has("b")).toBe(true);
        await _for(70);
        expect(cache.has("a")).toBe(false);
        expect(cache.has("b")).toBe(true);
      });
    });
  });

  describe("evictionPolicy", () => {
    it("should remove the least recently used key by default", () => {
      const cache = new Cache<string, number>(2);
      cache.put("a", 1);
      cache.put("b", 2);
      cache.get("a");
      cache.put("c", 3);
      expect(cache.has("b")).toBe(false);
    });
    it("should remove the most recently used (MRU) key", () => {
      const cache = new Cache<string, number>(2, {
        evictionPolicy: (cache) => cache.last!,
      });
      cache.put("a", 1);
      cache.put("b", 2);
      cache.get("a");
      cache.put("c", 3);
      expect(cache.has("a")).toBe(false);
    });
    it("should remove a random (RR) key", () => {
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
      const cache = new CacheWithList<string, number>(2, {
        evictionPolicy: (cache: CacheWithList<string, number>) =>
          cache.list![Math.floor(Math.random() * cache.list!.length)],
      });
      cache.put("a", 1);
      cache.put("b", 2);
      cache.get("a");
      cache.put("c", 3);
      expect(cache.size).toBe(2);
    });
    it("should remove the first in, first out (FIFO) key", () => {
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
      const cache = new CacheWithList<string, number>(2, {
        evictionPolicy: (cache: CacheWithList<string, number>) =>
          cache.list!.shift()!,
      });
      cache.put("a", 1);
      cache.put("b", 2);
      cache.get("a");
      cache.put("c", 3);
      expect(cache.has("a")).toBe(false);
    });
    it("should remove the last in, first out (LIFO) key", () => {
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
      const cache = new CacheWithList<string, number>(2, {
        evictionPolicy: (cache: CacheWithList<string, number>) =>
          cache.list!.pop()!,
      });
      cache.put("a", 1);
      cache.put("b", 2);
      cache.get("a");
      cache.put("c", 3);
      expect(cache.has("b")).toBe(false);
    });
    it("should remove the least frequently used (LFU) key", () => {
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
      cache.put("a", 1);
      cache.put("b", 2);
      cache.get("a");
      cache.put("c", 3);
      expect(cache.has("b")).toBe(false);
    });
    it("should remove the most frequently used (MRU) key", () => {
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
      cache.put("a", 1);
      cache.put("b", 2);
      cache.get("a");
      cache.put("c", 3);
      expect(cache.has("a")).toBe(false);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

import LRUCache, {
  CacheEvent,
  LRUCachePersistence,
  __test__uuidv4 as uuidv4,
} from "../src";

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal("localStorage", localStorageMock);

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
    describe("persistence", () => {
      it("should return undefined if persistence is not set", () => {
        const cache = new LRUCache<string, number>(1);
        expect(cache.persistence).toBe(undefined);
      });
      it("should return the persistence", () => {
        const persistence = new LRUCachePersistence<string, number>("foo");
        const cache = new LRUCache<string, number>(1, persistence);
        expect(cache.persistence).toBe(persistence);
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
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          undefined,
          logic,
        );
        const cache = new LRUCache<string, number>(1);
        expect(() => cache.persist()).toThrow("Persistence is not set");
        expect(logic.persist).not.toHaveBeenCalled();
        cache.persistence = persistence;
        cache.persist();
        expect(logic.persist).toHaveBeenCalled();
      });
    });
  });

  describe("methods", () => {
    describe("get", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });

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

      it("should persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          true,
          logic,
        );
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        cache.persistence = persistence;
        cache.get("a");
        expect(logic.persist).toHaveBeenCalledWith(new Map([["a", 1]]));
      });

      it("should not persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          false,
          logic,
        );
        const cache = new LRUCache<string, number>(1);
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

      it("should persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          true,
          logic,
        );
        const cache = new LRUCache<string, number>(1, persistence);
        cache.put("a", 1);
        expect(logic.persist).toHaveBeenCalledWith(new Map([["a", 1]]));
      });

      it("should not persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          false,
          logic,
        );
        const cache = new LRUCache<string, number>(1, persistence);
        cache.put("a", 1);
        expect(logic.persist).not.toHaveBeenCalledWith();
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
      beforeEach(() => {
        vi.restoreAllMocks();
      });
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

      it("should persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          true,
          logic,
        );
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.persistence = persistence;
        cache.remove("a");
        expect(logic.persist).toHaveBeenCalledWith(new Map([["b", 2]]));
      });

      it("should not persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          false,
          logic,
        );
        const cache = new LRUCache<string, number>(1);
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

      it("should persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          true,
          logic,
        );
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        cache.persistence = persistence;
        cache.clear();
        expect(logic.persist).toHaveBeenCalledWith(new Map());
      });

      it("should not persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          false,
          logic,
        );
        const cache = new LRUCache<string, number>(1);
        cache.put("a", 1);
        cache.persistence = persistence;
        cache.clear();
        expect(logic.persist).not.toHaveBeenCalledWith();
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
      beforeEach(() => {
        vi.restoreAllMocks();
      });
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
      it("should persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          true,
          logic,
        );
        const cache = new LRUCache<string, number>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.persistence = persistence;
        cache.resize(1);
        expect(logic.persist).toHaveBeenCalledWith(new Map([["b", 2]]));
      });
      it("should not persist the cache if persistence is set", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          false,
          logic,
        );
        const cache = new LRUCache<string, number>(2);
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
      it("should add multiple event listeners", () => {
        const cache = new LRUCache<string, number>(1);
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
    describe("persist", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should throw an error if persistence is not set", () => {
        const cache = new LRUCache<string, number>(1);
        expect(() => cache.persist()).toThrow("Persistence is not set");
      });
      it("should persist the cache", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          undefined,
          logic,
        );
        const cache = new LRUCache<string, number>(2, persistence);
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
        const cache = new LRUCache<string, number>(1);
        expect(() => cache.restore()).toThrow("Persistence is not set");
      });
      it("should restore the cache", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          undefined,
          logic,
        );
        logic.restore.mockReturnValue(
          new Map([
            ["a", 1],
            ["b", 2],
          ]),
        );
        const cache = new LRUCache<string, number>(2, persistence);
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
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          undefined,
          logic,
        );
        logic.restore.mockReturnValue(
          new Map([
            ["a", 1],
            ["b", 2],
          ]),
        );
        const cache = new LRUCache<string, number>(2, persistence);
        cache.put("c", 3);
        cache.restore();
        expect(cache.has("a")).toBe(true);
        expect(cache.has("b")).toBe(true);
        expect(cache.has("c")).toBe(false);
      });
      it("should restore an empty map if no data", () => {
        const persistence = new LRUCachePersistence<string, number>("foo");
        localStorageMock.getItem.mockReturnValue(null);
        const cache = new LRUCache<string, number>(2, persistence);
        cache.restore();
        expect(cache.size).toBe(0);
      });
    });
  });
});

describe("LRUCachePersistence", () => {
  describe("constructor", () => {
    it("should be a class", () => {
      expect(typeof LRUCachePersistence).toBe("function");
    });
    it("should be instantiable", () => {
      const persistence = new LRUCachePersistence<string, number>();
      expect(persistence).toBeInstanceOf(LRUCachePersistence);
    });
    it("should set values by default", () => {
      const persistence = new LRUCachePersistence<string, number>();
      expect(persistence.key).toBeDefined();
      expect(persistence.isAuto).toBe(false);
      expect(persistence.persist).toBeDefined();
      expect(persistence.restore).toBeDefined();
    });
  });

  describe("methods", () => {
    describe("persist", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should default to localStorage", () => {
        const persistence = new LRUCachePersistence<string, number>();
        const cache = new Map<string, number>();
        cache.set("a", 1);
        persistence.persist(cache);

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          persistence.key,
          JSON.stringify([{ key: "a", value: 1 }]),
        );
      });
      it("should use the provided storage", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          undefined,
          logic,
        );
        const cache = new Map<string, number>();
        cache.set("a", 1);
        persistence.persist(cache);

        expect(logic.persist).toHaveBeenCalledWith(cache);
      });
    });
    describe("restore", () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });
      it("should default to localStorage", () => {
        const persistence = new LRUCachePersistence<string, number>();
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify([{ key: "a", value: 1 }]),
        );
        const cache = persistence.restore();

        expect(localStorageMock.getItem).toHaveBeenCalledWith(persistence.key);
        expect(cache.get("a")).toBe(1);
      });
      it("should use the provided storage", () => {
        const logic = {
          persist: vi.fn(),
          restore: vi.fn(),
        };
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          undefined,
          logic,
        );
        logic.restore.mockReturnValue(new Map([["a", 1]]));
        const cache = persistence.restore();

        expect(logic.restore).toHaveBeenCalled();
        expect(cache.get("a")).toBe(1);
      });
    });
  });

  describe("getters", () => {
    describe("key", () => {
      it("should return the key", () => {
        const persistence = new LRUCachePersistence<string, number>("foo");
        expect(persistence.key).toBe("foo");
      });
    });

    describe("isAuto", () => {
      it("should return false if not set", () => {
        const persistence = new LRUCachePersistence<string, number>("foo");
        expect(persistence.isAuto).toBe(false);
      });
      it.each([
        [true, true],
        [false, false],
      ])("should return the value if set", (input, expected) => {
        const persistence = new LRUCachePersistence<string, number>(
          "foo",
          input,
        );
        expect(persistence.isAuto).toBe(expected);
      });
    });
  });
});

describe("uuidv4", () => {
  it("should return a string", () => {
    expect(typeof uuidv4()).toBe("string");
  });
  it("should return a unique string", () => {
    const uuid1 = uuidv4();
    const uuid2 = uuidv4();
    expect(uuid1).not.toBe(uuid2);
  });
});

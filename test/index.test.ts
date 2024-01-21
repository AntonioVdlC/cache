import { describe, it, expect } from "vitest";

import LRUCache from "../src";

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
  });
});

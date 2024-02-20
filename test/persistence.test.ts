import { describe, it, expect, beforeEach, vi } from "vitest";
import { CachePersistence } from "../src";

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal("localStorage", localStorageMock);

describe("CachePersistence", () => {
  describe("constructor", () => {
    it("should be a class", () => {
      expect(typeof CachePersistence).toBe("function");
    });
    it("should be instantiable", () => {
      const persistence = new CachePersistence<string, number>();
      expect(persistence).toBeInstanceOf(CachePersistence);
    });
    it("should set values by default", () => {
      const persistence = new CachePersistence<string, number>();
      expect(persistence.key).toBeDefined();
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
        const persistence = new CachePersistence<string, number>();
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
        const persistence = new CachePersistence<string, number>("foo", logic);
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
        const persistence = new CachePersistence<string, number>();
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
        const persistence = new CachePersistence<string, number>("foo", logic);
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
        const persistence = new CachePersistence<string, number>("foo");
        expect(persistence.key).toBe("foo");
      });
    });
  });
});

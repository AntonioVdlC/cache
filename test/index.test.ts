import { describe, it, expect } from "vitest";
import { Cache, CacheEvent, CachePersistence } from "../src";

describe("exports", () => {
  it("should export Cache", () => {
    expect(Cache).toBeDefined();
  });
  it("should export CacheEvent", () => {
    expect(CacheEvent).toBeDefined();
  });
  it("should export CachePersistence", () => {
    expect(CachePersistence).toBeDefined();
  });
});

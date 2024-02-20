import { describe, it, expect } from "vitest";
import { CacheEvent } from "../src/events";

describe("CacheEvent", () => {
  it("should be an enum", () => {
    expect(typeof CacheEvent).toBe("object");
  });
  it("should have the insertion property", () => {
    expect(CacheEvent.Insertion).toBeDefined();
  });
  it("should have the eviction property", () => {
    expect(CacheEvent.Eviction).toBeDefined();
  });
  it("should have the removal property", () => {
    expect(CacheEvent.Removal).toBeDefined();
  });
  it("should have the full property", () => {
    expect(CacheEvent.Full).toBeDefined();
  });
  it("should have the empty property", () => {
    expect(CacheEvent.Empty).toBeDefined();
  });
});

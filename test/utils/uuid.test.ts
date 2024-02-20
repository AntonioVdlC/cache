import { describe, it, expect } from "vitest";

import { uuidv4 } from "../../src/utils/uuid";

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

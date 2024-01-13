import { describe, it, expect } from "vitest";

import add from "../src";

describe("add", () => {
  it("is a function", () => {
    expect(typeof add).toBe("function");
  });

  it("adds 2 numbers", () => {
    const a = 1234;
    const b = 4321;

    expect(add(a, b)).toBe(a + b);
  });
});

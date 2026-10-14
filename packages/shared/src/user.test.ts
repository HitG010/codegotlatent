import { describe, expect, it } from "vitest";
import { handleSchema } from "./user.js";

describe("handleSchema", () => {
  it("accepts and lowercases valid handles", () => {
    expect(handleSchema.parse("Hitesh_G")).toBe("hitesh_g");
    expect(handleSchema.parse("  dev42 ")).toBe("dev42");
    expect(handleSchema.parse("a1b")).toBe("a1b");
  });

  it("rejects bad shapes and reserved names", () => {
    for (const bad of ["ab", "_dev", "dev_", "has space", "dot.ted", "x".repeat(21), "admin", "Me"]) {
      expect(handleSchema.safeParse(bad).success).toBe(false);
    }
  });
});

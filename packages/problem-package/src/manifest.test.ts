import { describe, expect, it } from "vitest";
import { parseValidatorArgs } from "./manifest.js";

describe("parseValidatorArgs", () => {
  it("defaults to the forgiving token comparison", () => {
    expect(parseValidatorArgs([])).toEqual({
      kind: "default",
      caseSensitive: false,
      spaceSensitive: false,
    });
  });

  it("reads flags and tolerances, as one string or split up", () => {
    expect(parseValidatorArgs(["case_sensitive", "float_absolute_tolerance 1e-6"])).toEqual({
      kind: "default",
      caseSensitive: true,
      spaceSensitive: false,
      floatAbsoluteTolerance: 1e-6,
    });
    expect(parseValidatorArgs(["float_tolerance", "1e-9"])).toMatchObject({
      floatAbsoluteTolerance: 1e-9,
      floatRelativeTolerance: 1e-9,
    });
  });

  it("rejects what the spec forbids", () => {
    expect(() => parseValidatorArgs(["float_tolerance 1e-6", "float_absolute_tolerance 1e-3"])).toThrow();
    expect(() => parseValidatorArgs(["float_absolute_tolerance 1", "float_absolute_tolerance 2"])).toThrow();
    expect(() => parseValidatorArgs(["float_tolerance"])).toThrow(/positive number/);
    expect(() => parseValidatorArgs(["float_tolerance -1"])).toThrow(/positive number/);
    expect(() => parseValidatorArgs(["ignore_case"])).toThrow(/unknown/);
  });
});

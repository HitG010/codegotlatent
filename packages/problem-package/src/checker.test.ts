import type { Checker } from "@cgl/shared";
import { describe, expect, it } from "vitest";
import { checkOutput } from "./checker.js";

const DEFAULT: Checker = { kind: "default", caseSensitive: false, spaceSensitive: false };

describe("checkOutput, default rules", () => {
  it("ignores the amount and kind of whitespace", () => {
    expect(checkOutput("1 2\n3\n", "1\t2   3", DEFAULT)).toEqual({ accepted: true });
    expect(checkOutput("42\n", "  42\r\n\n", DEFAULT)).toEqual({ accepted: true });
  });

  it("ignores ASCII case unless asked not to", () => {
    expect(checkOutput("YES", "yes", DEFAULT).accepted).toBe(true);
    expect(checkOutput("YES", "yes", { ...DEFAULT, caseSensitive: true }).accepted).toBe(false);
  });

  it("reports the first differing token", () => {
    expect(checkOutput("1 2 3", "1 5 3", DEFAULT)).toEqual({
      accepted: false,
      reason: 'Token 2: expected "2", got "5"',
    });
  });

  it("rejects missing and extra output", () => {
    expect(checkOutput("1 2", "1", DEFAULT)).toEqual({ accepted: false, reason: "Expected 2 tokens, got 1" });
    expect(checkOutput("1", "1 2", DEFAULT).accepted).toBe(false);
    expect(checkOutput("1", "", DEFAULT).accepted).toBe(false);
    expect(checkOutput("", "\n", DEFAULT).accepted).toBe(true);
  });

  it("compares numbers as strings when no tolerance is set", () => {
    expect(checkOutput("1.0", "1", DEFAULT).accepted).toBe(false);
  });
});

describe("checkOutput, space_change_sensitive", () => {
  const strict: Checker = { ...DEFAULT, spaceSensitive: true };

  it("requires identical whitespace", () => {
    expect(checkOutput("1 2\n", "1 2\n", strict).accepted).toBe(true);
    expect(checkOutput("1 2\n", "1  2\n", strict).accepted).toBe(false);
    expect(checkOutput("1 2\n", "1 2", strict).accepted).toBe(false);
  });
});

describe("checkOutput, float tolerances", () => {
  it("accepts within the absolute tolerance", () => {
    const abs: Checker = { ...DEFAULT, floatAbsoluteTolerance: 1e-6 };
    expect(checkOutput("3.1415926", "3.1415930", abs).accepted).toBe(true);
    expect(checkOutput("3.1415926", "3.1416", abs).accepted).toBe(false);
  });

  it("accepts within the relative tolerance of the answer", () => {
    const rel: Checker = { ...DEFAULT, floatRelativeTolerance: 1e-3 };
    expect(checkOutput("1000000", "1000500", rel).accepted).toBe(true);
    expect(checkOutput("1000000", "1002000", rel).accepted).toBe(false);
  });

  it("passes if either tolerance is met", () => {
    const both: Checker = { ...DEFAULT, floatAbsoluteTolerance: 1e-6, floatRelativeTolerance: 1e-6 };
    expect(checkOutput("0", "0.0000005", both).accepted).toBe(true);
    expect(checkOutput("1e9", "1000000500", both).accepted).toBe(true);
  });

  it("still compares words as words, and wants a number where one is expected", () => {
    const abs: Checker = { ...DEFAULT, floatAbsoluteTolerance: 1e-6 };
    expect(checkOutput("Case 1: 0.5", "case 1: 0.5000001", abs).accepted).toBe(true);
    expect(checkOutput("0.5", "half", abs).accepted).toBe(false);
  });
});

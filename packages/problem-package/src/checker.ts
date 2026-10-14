import type { Checker } from "@cgl/shared";

export type CheckResult = { accepted: true } | { accepted: false; reason: string };

// Whitespace as defined by the ICPC package format's default validator
const WHITESPACE = /[ \f\n\r\t\v]+/;
const WHITESPACE_KEPT = /([ \f\n\r\t\v]+)/;
const FLOAT = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

const lowerAscii = (s: string) => s.replace(/[A-Z]/g, (c) => c.toLowerCase());
const preview = (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s);

function tokensMatch(answer: string, output: string, checker: Checker): boolean {
  const { floatAbsoluteTolerance: abs, floatRelativeTolerance: rel } = checker;
  if ((abs !== undefined || rel !== undefined) && FLOAT.test(answer)) {
    if (!FLOAT.test(output)) return false;
    const expected = Number(answer);
    const error = Math.abs(Number(output) - expected);
    return (
      (abs !== undefined && error <= abs) ||
      (rel !== undefined && error <= rel * Math.abs(expected))
    );
  }
  return checker.caseSensitive ? answer === output : lowerAscii(answer) === lowerAscii(output);
}

/**
 * Compares a submission's output with the answer file the way the package
 * format's default output validator does. The reason may quote expected
 * output, so only show it for sample tests.
 */
export function checkOutput(answer: string, output: string, checker: Checker): CheckResult {
  if (checker.spaceSensitive) {
    const expected = answer.split(WHITESPACE_KEPT);
    const actual = output.split(WHITESPACE_KEPT);
    for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
      const e = expected[i];
      const a = actual[i];
      if (e === undefined || a === undefined) {
        return { accepted: false, reason: "Output length differs from the expected output" };
      }
      const isSpace = i % 2 === 1; // split with a capture group alternates token, separator
      if (isSpace ? e !== a : !tokensMatch(e, a, checker)) {
        return {
          accepted: false,
          reason: isSpace
            ? "Whitespace differs from the expected output"
            : `Expected "${preview(e)}", got "${preview(a)}"`,
        };
      }
    }
    return { accepted: true };
  }

  const expected = answer.split(WHITESPACE).filter(Boolean);
  const actual = output.split(WHITESPACE).filter(Boolean);
  for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
    if (!tokensMatch(expected[i]!, actual[i]!, checker)) {
      return {
        accepted: false,
        reason: `Token ${i + 1}: expected "${preview(expected[i]!)}", got "${preview(actual[i]!)}"`,
      };
    }
  }
  if (expected.length !== actual.length) {
    return {
      accepted: false,
      reason: `Expected ${expected.length} tokens, got ${actual.length}`,
    };
  }
  return { accepted: true };
}

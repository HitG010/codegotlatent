import type { Checker } from "@cgl/shared";
import { z } from "zod";

// The subset of ICPC problem package format 2025-09 that CGL supports.
// https://www.kattis.com/problem-package-format/spec/2025-09.html
export const problemYamlSchema = z.looseObject({
  problem_format_version: z.literal("2025-09"),
  name: z.union([z.string().min(1), z.looseObject({ en: z.string().min(1) })]),
  uuid: z.string().min(1),
  type: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .refine((type) => type === undefined || [type].flat().every((t) => t === "pass-fail"), {
      message: "only pass-fail problems are supported for now",
    }),
  limits: z.looseObject({
    time_limit: z.number().positive().max(10),
    memory: z.number().int().positive().max(1024),
  }),
  keywords: z.array(z.string().min(1)).optional(),
});

/** CGL's own metadata, kept out of problem.yaml so the package stays standard. */
export const cglYamlSchema = z.strictObject({
  difficulty: z.enum(["easy", "medium", "hard"]),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase letters, digits and dashes")
    .optional(),
});

export const testGroupYamlSchema = z.looseObject({
  output_validator_args: z.array(z.string()).optional(),
});

/** Turns default output validator arguments into a checker config. */
export function parseValidatorArgs(args: readonly string[]): Checker {
  const tokens = args.flatMap((arg) => arg.trim().split(/\s+/)).filter(Boolean);
  const checker: Checker = { kind: "default", caseSensitive: false, spaceSensitive: false };
  let usedCombinedTolerance = false;

  const readTolerance = (flag: string, i: number) => {
    const value = Number(tokens[i + 1]);
    if (tokens[i + 1] === undefined || !Number.isFinite(value) || value <= 0) {
      throw new Error(`${flag} needs a positive number after it`);
    }
    return value;
  };
  const setOnce = (key: "floatAbsoluteTolerance" | "floatRelativeTolerance", value: number) => {
    if (checker[key] !== undefined) throw new Error("a float tolerance is given more than once");
    checker[key] = value;
  };

  for (let i = 0; i < tokens.length; i++) {
    const flag = tokens[i]!;
    switch (flag) {
      case "case_sensitive":
        checker.caseSensitive = true;
        break;
      case "space_change_sensitive":
        checker.spaceSensitive = true;
        break;
      case "float_tolerance": {
        const value = readTolerance(flag, i++);
        setOnce("floatAbsoluteTolerance", value);
        setOnce("floatRelativeTolerance", value);
        usedCombinedTolerance = true;
        break;
      }
      case "float_absolute_tolerance":
        if (usedCombinedTolerance) throw new Error("float_tolerance can't be combined with other tolerances");
        setOnce("floatAbsoluteTolerance", readTolerance(flag, i++));
        break;
      case "float_relative_tolerance":
        if (usedCombinedTolerance) throw new Error("float_tolerance can't be combined with other tolerances");
        setOnce("floatRelativeTolerance", readTolerance(flag, i++));
        break;
      default:
        throw new Error(`unknown output validator argument "${flag}"`);
    }
  }
  return checker;
}

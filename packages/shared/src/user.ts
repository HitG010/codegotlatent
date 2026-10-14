import { z } from "zod";

// Handles appear in standings and profile URLs (/u/:handle), so they're
// short, lowercase and unambiguous.
const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "cgl",
  "codegotlatent",
  "login",
  "logout",
  "me",
  "null",
  "root",
  "settings",
  "support",
  "undefined",
  "you",
]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/, {
    message: "Use 3–20 lowercase letters, digits or underscores, starting and ending with a letter or digit",
  })
  .refine((handle) => !RESERVED_HANDLES.has(handle), { message: "That handle is reserved" });

export type Handle = z.infer<typeof handleSchema>;

/** The signed-in user, as the API returns them. */
export const sessionUserSchema = z.object({
  id: z.string(),
  handle: z.string(),
  name: z.string().nullable(),
  role: z.enum(["USER", "ADMIN"]),
  /** False until the user picks their own handle after first sign-in. */
  handleConfirmed: z.boolean(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

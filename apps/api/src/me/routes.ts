import { handleSchema } from "@cgl/shared";
import { Router } from "express";
import { z } from "zod";
import { SESSION_USER } from "../auth/sessions.js";
import { isUniqueViolation, toSessionUser } from "../auth/users.js";
import type { Db } from "../db.js";
import { requireUser } from "../http/auth.js";
import { HttpError } from "../http/errors.js";

export function meRouter({ db, accessTokenSecret }: { db: Db; accessTokenSecret: string }): Router {
  const router = Router();
  const signedIn = requireUser(accessTokenSecret);

  router.get("/me", signedIn, async (req, res) => {
    const user = await db.user.findUnique({ where: { id: req.user!.id }, select: SESSION_USER });
    if (!user) throw new HttpError(404, "not_found", "Account not found");
    res.json({ user: toSessionUser(user) });
  });

  router.patch("/me/handle", signedIn, async (req, res) => {
    const { handle } = z.object({ handle: handleSchema }).parse(req.body);
    try {
      const user = await db.user.update({
        where: { id: req.user!.id },
        data: { username: handle, handleConfirmedAt: new Date() },
        select: SESSION_USER,
      });
      res.json({ user: toSessionUser(user) });
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, "handle_taken", "That handle is taken");
      throw error;
    }
  });

  return router;
}

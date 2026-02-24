import crypto from "crypto";
import { NextFunction, Response, Router } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import zod from "zod";

import { APP_URL, SECRET } from "@/config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, REQUEST_EXPIRED, RESSOURCE_ALREADY_EXIST } from "@/error";
import { sendTemplate } from "@/services/brevo";
import { loginHistoryService } from "@/services/login-history";
import { publisherService } from "@/services/publisher";
import { userService } from "@/services/user";
import { UserRequest } from "@/types/passport";
import type { UserUpdatePatch } from "@/types/user";
import { hasLetter, hasNumber, hasSpecialChar } from "@/utils";

const FORGET_PASSWORD_EXPIRATION = 1000 * 60 * 60 * 2; // 2 hours
const AUTH_TOKEN_EXPIRATION = 1000 * 60 * 60 * 24 * 7; // 7 day

const router = Router();

router.post("/search", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        email: zod.string().email().optional(),
        publisherId: zod.string().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const filters = {
      includeDeleted: false,
      email: body.data.email,
      publisherId: body.data.publisherId,
    };

    const users = await userService.findUsers(filters);
    return res.status(200).send({ ok: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.get("/refresh", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const user = await userService.findUserById(req.user.id, { includeDeleted: true });
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "User not found" });
    }

    const token = jwt.sign({ _id: user.id }, SECRET, {
      expiresIn: AUTH_TOKEN_EXPIRATION,
    });

    if (user.publishers.length === 0) {
      return res.send({ ok: true, data: { token, user, publisher: null } });
    }

    let publisher = null;
    if (query.data.publisherId && (user.publishers.includes(query.data.publisherId) || user.role === "admin")) {
      publisher = await publisherService.findOnePublisherById(query.data.publisherId);
    }
    if (!publisher && user.publishers[0]) {
      publisher = await publisherService.findOnePublisherById(user.publishers[0]);
    }

    return res.send({ ok: true, data: { token, user, publisher } });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    if (req.user.role !== "admin" && req.user.id !== params.data.id) {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: `Not allowed` });
    }

    const data = await userService.findUserById(params.data.id, { includeDeleted: true });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/loginas/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const user = await userService.findUserById(params.data.id, { includeDeleted: true });
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    const publisher = user.publishers[0] ? await publisherService.findOnePublisherById(user.publishers[0]) : null;
    if (!publisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `Publisher not found` });
    }

    const token = jwt.sign({ _id: user.id }, SECRET, {
      expiresIn: AUTH_TOKEN_EXPIRATION,
    });
    return res.status(200).send({ ok: true, data: { user, publisher, token } });
  } catch (error) {
    next(error);
  }
});

router.post("/invite", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        firstname: zod.string(),
        lastname: zod.string().optional(),
        email: zod.string().email(),
        publishers: zod.array(zod.string()).min(1),
        role: zod.enum(["admin", "user"]).default("user"),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const email = body.data.email.toLowerCase().trim();
    const exists = await userService.findUserByEmail(email);
    if (exists) {
      return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, message: `User already exists` });
    }

    const invitationToken = crypto.randomBytes(20).toString("hex");
    const invitationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72);
    const user = await userService.createUser({
      email,
      firstname: body.data.firstname,
      lastname: body.data.lastname ?? null,
      publishers: body.data.publishers,
      role: body.data.role,
      invitationToken,
      invitationExpiresAt,
    });

    await sendTemplate(1, {
      emailTo: [user.email],
      params: { link: `${APP_URL}/signup?token=${user.invitationToken}` },
    });

    return res.status(200).send({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-token", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        token: zod.string(),
      })
      .required()
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const user = await userService.findUserByInvitationToken(body.data.token);
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }
    if (!user.invitationExpiresAt || user.invitationExpiresAt < new Date()) {
      return res.status(403).send({ ok: false, code: REQUEST_EXPIRED, message: `Token expired` });
    }

    return res.status(200).send({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-reset-password-token", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        token: zod.string(),
      })
      .required()
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const user = await userService.findUserByForgotPasswordToken(body.data.token);
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    if (!user.forgotPasswordExpiresAt || user.forgotPasswordExpiresAt < new Date()) {
      return res.status(403).send({ ok: false, code: REQUEST_EXPIRED, message: `Token expired` });
    }

    return res.status(200).send({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.post("/signup", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        id: zod.string(),
        firstname: zod.string(),
        lastname: zod.string(),
        password: zod.string(),
      })
      .required()
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    if (body.data.password.length < 12 || !hasLetter(body.data.password) || !hasNumber(body.data.password) || !hasSpecialChar(body.data.password)) {
      return res.status(400).send({ ok: false, code: "INVALID_PASSWORD" });
    }

    const user = await userService.findUserById(body.data.id, { includeDeleted: true });
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    await userService.updateUser(user.id, {
      firstname: body.data.firstname,
      lastname: body.data.lastname,
      password: body.data.password,
      invitationToken: null,
      invitationExpiresAt: null,
      invitationCompletedAt: new Date(),
    });

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        email: zod.string().email(),
        password: zod.string(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(404).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const start = Date.now();
    const email = body.data.email.toLowerCase().trim();
    const user = await userService.findUserByEmail(email);

    const match = user ? await userService.comparePassword(user, body.data.password) : false;
    const delay = 1000 - (Date.now() - start);

    setTimeout(
      async () => {
        if (!user || !match) {
          return res.status(404).send({ ok: false, code: NOT_FOUND, message: `Incorrect email or password` });
        }

        const publisher = user.publishers.length ? await publisherService.findOnePublisherById(user.publishers[0]) : null;
        const now = new Date();
        const updatedUser = await userService.updateUser(user.id, { lastActivityAt: now });
        await loginHistoryService.recordLogin(user.id, now);

        const token = jwt.sign({ _id: updatedUser.id }, SECRET, { expiresIn: AUTH_TOKEN_EXPIRATION });
        return res.status(200).send({ ok: true, data: { user: updatedUser, publisher, token } });
      },
      delay > 0 ? delay : 0
    );
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        email: zod.string().email(),
      })
      .required()
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const email = body.data.email.toLowerCase().trim();
    const user = await userService.findUserByEmail(email);

    if (user) {
      const token = crypto.randomBytes(20).toString("hex");
      await userService.updateUser(user.id, {
        forgotPasswordToken: token,
        forgotPasswordExpiresAt: new Date(Date.now() + FORGET_PASSWORD_EXPIRATION),
      });

      await sendTemplate(5, {
        emailTo: [body.data.email],
        params: { link: `${APP_URL}/reset-password?token=${token}` },
      });
    }
    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.put("/", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        firstname: zod.string(),
        lastname: zod.string().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const updated = await userService.updateUser(req.user.id, {
      firstname: body.data.firstname,
      lastname: body.data.lastname ?? null,
    });

    res.status(200).send({ ok: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.put("/change-password", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        oldPassword: zod.string(),
        newPassword: zod.string(),
      })
      .required()
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    if (body.data.newPassword.length < 12 || !hasLetter(body.data.newPassword) || !hasNumber(body.data.newPassword) || !hasSpecialChar(body.data.newPassword)) {
      return res.status(400).send({ ok: false, code: "INVALID_PASSWORD" });
    }

    const match = await userService.comparePassword(req.user, body.data.oldPassword);
    if (!match) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: `Old password is not correct` });
    }

    await userService.updateUser(req.user.id, { password: body.data.newPassword });

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.put("/reset-password", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        token: zod.string(),
        password: zod.string(),
      })
      .required()
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const user = await userService.findUserByForgotPasswordToken(body.data.token);
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    if (!user.forgotPasswordExpiresAt || user.forgotPasswordExpiresAt < new Date()) {
      return res.status(403).send({ ok: false, code: REQUEST_EXPIRED, message: `Token expired` });
    }

    if (body.data.password.length < 12 || !hasLetter(body.data.password) || !hasNumber(body.data.password) || !hasSpecialChar(body.data.password)) {
      return res.status(400).send({ ok: false, code: "INVALID_PASSWORD" });
    }

    await userService.updateUser(user.id, {
      password: body.data.password,
      forgotPasswordToken: null,
      forgotPasswordExpiresAt: null,
    });

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/reset-password", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const user = await userService.findUserById(params.data.id, { includeDeleted: true });
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }
    const password = Math.random().toString(36).slice(-8);
    await userService.updateUser(user.id, { password });

    return res.status(200).send({ ok: true, data: password });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/invite-again", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const user = await userService.findUserById(params.data.id, { includeDeleted: true });
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    const invitationToken = crypto.randomBytes(20).toString("hex");
    await userService.updateUser(user.id, {
      password: null,
      invitationToken,
      invitationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72),
      invitationCompletedAt: null,
    });

    await sendTemplate(1, {
      emailTo: [user.email],
      params: { link: `${APP_URL}/signup?token=${invitationToken}` },
    });

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    const body = zod
      .object({
        firstname: zod.string().optional(),
        lastname: zod.string().optional(),
        email: zod.string().email().optional(),
        publishers: zod.array(zod.string()).min(1).optional(),
        role: zod.enum(["admin", "user"]).optional(),
      })
      .safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const user = await userService.findUserById(params.data.id, { includeDeleted: true });
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    const patch: UserUpdatePatch = {};
    if (typeof body.data.lastname !== "undefined") {
      patch.lastname = body.data.lastname ?? null;
    }
    if (body.data.firstname) {
      patch.firstname = body.data.firstname;
    }
    if (body.data.email) {
      patch.email = body.data.email.toLowerCase().trim();
    }
    if (body.data.publishers) {
      patch.publishers = body.data.publishers;
    }
    if (body.data.role) {
      patch.role = body.data.role;
    }

    const updated = Object.keys(patch).length ? await userService.updateUser(user.id, patch) : user;

    res.status(200).send({ ok: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const user = await userService.findUserById(params.data.id, { includeDeleted: true });
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    await userService.updateUser(user.id, { deletedAt: new Date() });

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;

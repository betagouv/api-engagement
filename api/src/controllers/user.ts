import crypto from "crypto";
import { NextFunction, Response, Router } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import zod from "zod";

import { HydratedDocument } from "mongoose";
import { APP_URL, SECRET } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, REQUEST_EXPIRED, RESSOURCE_ALREADY_EXIST } from "../error";
import PublisherModel from "../models/publisher";
import UserModel from "../models/user";
import { sendTemplate } from "../services/brevo";
import { User } from "../types";
import { UserRequest } from "../types/passport";
import { hasLetter, hasNumber, hasSpecialChar } from "../utils";

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
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error.errors });
    }

    const where = { deletedAt: null } as { [key: string]: any };
    if (body.data.email) {
      where.email = body.data.email;
    }
    if (body.data.publisherId) {
      where.publishers = { $in: body.data.publisherId };
    }

    const users = await UserModel.find(where);
    return res.status(200).send({ ok: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.get("/refresh", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as HydratedDocument<User>;
    const query = zod
      .object({
        publisherId: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error.errors });
    }

    await user.save();

    const token = jwt.sign({ _id: req.user._id.toString() }, SECRET, {
      expiresIn: AUTH_TOKEN_EXPIRATION,
    });

    if (user.publishers.length === 0) {
      return res.send({ ok: true, data: { token, user, publisher: null } });
    }

    let publisher;
    if (query.data.publisherId && (user.publishers.includes(query.data.publisherId) || user.role === "admin")) {
      publisher = await PublisherModel.findById(query.data.publisherId);
    }
    if (!publisher) {
      publisher = await PublisherModel.findById(user.publishers[0]);
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
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error.errors });
    }

    if (req.user.role !== "admin" && req.user._id.toString() !== params.data.id) {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: `Not allowed` });
    }

    const data = await UserModel.findById(params.data.id);
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
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error.errors });
    }

    const user = await UserModel.findById(params.data.id);
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    const publisher = await PublisherModel.findById(user.publishers[0]);
    if (!publisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `Publisher not found` });
    }

    const token = jwt.sign({ _id: user._id.toString() }, SECRET, {
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
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error.errors });
    }

    const email = body.data.email.toLowerCase().trim();
    const exists = await UserModel.findOne({ email });
    if (exists) {
      return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, message: `User already exists` });
    }

    const user = new UserModel({
      email,
      firstname: body.data.firstname,
      lastname: body.data.lastname,
      publishers: body.data.publishers,
      role: body.data.role,
      invitedAt: new Date(),
      invitationToken: crypto.randomBytes(20).toString("hex"),
      invitationExpiresAt: Date.now() + 1000 * 60 * 60 * 72, // 72 hours
    });
    await user.save();

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
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error.errors });
    }

    const user = await UserModel.findOne({ invitationToken: body.data.token });
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
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error.errors });
    }

    const user = await UserModel.findOne({ forgotPasswordToken: body.data.token });
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
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error.errors });
    }

    if (body.data.password.length < 12 || !hasLetter(body.data.password) || !hasNumber(body.data.password) || !hasSpecialChar(body.data.password)) {
      return res.status(400).send({ ok: false, code: "INVALID_PASSWORD" });
    }

    const user = await UserModel.findById(body.data.id);
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    user.firstname = body.data.firstname;
    user.lastname = body.data.lastname;
    user.password = body.data.password;
    user.invitationToken = null;
    user.invitationExpiresAt = null;
    user.invitationCompletedAt = new Date();
    await user.save();

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
      return res.status(404).send({ ok: false, code: INVALID_BODY, message: body.error.errors });
    }

    const start = Date.now();
    const email = body.data.email.toLowerCase().trim();
    const user = await UserModel.findOne({ email });
    const match = user ? await user.comparePassword(body.data.password) : false;
    const delay = 1000 - (Date.now() - start);

    setTimeout(
      async () => {
        if (!user || !match) {
          return res.status(404).send({ ok: false, code: NOT_FOUND, message: `Incorrect email or password` });
        }

        const publisher = user.publishers.length ? await PublisherModel.findById(user.publishers[0]) : null;

        user.lastActivityAt = new Date();
        if (!user.loginAt) {
          user.loginAt = [];
        }
        user.loginAt.push(new Date());
        await user.save();

        const token = jwt.sign({ _id: user.id }, SECRET, { expiresIn: AUTH_TOKEN_EXPIRATION });
        return res.status(200).send({ ok: true, data: { user, publisher, token } });
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

    const user = await UserModel.findOne({ email: body.data.email });

    if (user) {
      user.forgotPasswordToken = crypto.randomBytes(20).toString("hex");
      user.forgotPasswordExpiresAt = new Date(Date.now() + FORGET_PASSWORD_EXPIRATION);
      await user.save();

      await sendTemplate(5, {
        emailTo: [body.data.email],
        params: { link: `${APP_URL}/reset-password?token=${user.forgotPasswordToken}` },
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
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error.errors });
    }

    req.user.lastname = body.data.lastname;
    req.user.firstname = body.data.firstname;
    await req.user.save();

    res.status(200).send({ ok: true, data: req.user });
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

    const match = await req.user.comparePassword(body.data.oldPassword);
    if (!match) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: `Old password is not correct` });
    }

    req.user.password = body.data.newPassword;
    await req.user.save();

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
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error.errors });
    }

    const user = await UserModel.findOne({ forgotPasswordToken: body.data.token });
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    if (!user.forgotPasswordExpiresAt || user.forgotPasswordExpiresAt < new Date()) {
      return res.status(403).send({ ok: false, code: REQUEST_EXPIRED, message: `Token expired` });
    }

    if (body.data.password.length < 12 || !hasLetter(body.data.password) || !hasNumber(body.data.password) || !hasSpecialChar(body.data.password)) {
      return res.status(400).send({ ok: false, code: "INVALID_PASSWORD" });
    }

    user.password = body.data.password;
    user.forgotPasswordToken = null;
    user.forgotPasswordExpiresAt = null;
    await user.save();

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
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error.errors });
    }

    const user = await UserModel.findById(params.data.id);
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }
    const password = Math.random().toString(36).slice(-8);
    user.password = password;
    await user.save();

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
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error.errors });
    }

    const user = await UserModel.findById(params.data.id);
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    user.password = null;
    user.invitationToken = crypto.randomBytes(20).toString("hex");
    user.invitationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72); // 72 hours
    user.invitationCompletedAt = null;
    await user.save();

    await sendTemplate(1, {
      emailTo: [user.email],
      params: { link: `${APP_URL}/signup?token=${user.invitationToken}` },
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
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error.errors });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error.errors });
    }

    const user = await UserModel.findById(params.data.id);
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    user.lastname = body.data.lastname;
    if (body.data.firstname) {
      user.firstname = body.data.firstname;
    }
    if (body.data.email) {
      user.email = body.data.email;
    }
    if (body.data.publishers) {
      user.publishers = body.data.publishers;
    }
    if (body.data.role) {
      user.role = body.data.role;
    }
    await user.save();

    res.status(200).send({ ok: true, data: user });
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
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error.errors });
    }

    const user = await UserModel.findById(params.data.id);
    if (!user) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    }

    user.deletedAt = new Date();
    await user.save();

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;

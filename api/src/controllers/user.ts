import crypto from "crypto";
import { NextFunction, Response, Router } from "express";
import Joi from "joi";
import jwt from "jsonwebtoken";
import passport from "passport";
import zod from "zod";

import { APP_URL, SECRET } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, REQUEST_EXPIRED, RESSOURCE_ALREADY_EXIST } from "../error";
import PublisherModel from "../models/publisher";
import UserModel from "../models/user";
import { sendTemplate } from "../services/email";
import { UserRequest } from "../types/passport";

const FORGET_PASSWORD_EXPIRATION = 1000 * 60 * 60 * 2; // 2 hours
const AUTH_TOKEN_EXPIRATION = 1000 * 60 * 60 * 24 * 7; // 7 day

const router = Router();

router.get("/", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: queryError, value: query } = Joi.object({
      email: Joi.string().email(),
      publisherId: Joi.string(),
    })
      .unknown()
      .validate(req.query);

    if (queryError) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: queryError.details });

    const where = {} as { [key: string]: any };
    if (query.email) where.email = query.email;
    if (query.publisherId) where.publishers = { $in: query.publisherId };
    const users = await UserModel.find(where).sort("-last_login_at");
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

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error.errors });

    req.user.last_login_at = new Date();
    await req.user.save();

    const token = jwt.sign({ _id: req.user._id.toString() }, SECRET, { expiresIn: AUTH_TOKEN_EXPIRATION });

    if (req.user.publishers.length === 0) return res.send({ ok: true, data: { token, user: req.user, publisher: null } });

    let publisher;
    if (query.data.publisherId && (req.user.publishers.includes(query.data.publisherId) || req.user.role === "admin")) {
      publisher = await PublisherModel.findById(query.data.publisherId);
    }
    if (!publisher) publisher = await PublisherModel.findById(req.user.publishers[0]);

    return res.send({ ok: true, data: { token, user: req.user, publisher } });
  } catch (error) {
    next(error);
  }
});

router.get("/:userId", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      userId: Joi.string().required(),
    }).validate(req.params);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: paramsError.details });

    if (req.user.role !== "admin" && req.user._id.toString() !== params.userId) return res.status(403).send({ ok: false, code: FORBIDDEN, message: `Not allowed` });

    const data = await UserModel.findById(params.userId);
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/loginas/:userId", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      userId: Joi.string().required(),
    }).validate(req.params);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: paramsError.details });

    const user = await UserModel.findById(params.userId);
    if (!user) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });

    const publisher = await PublisherModel.findById(user.publishers[0]);
    if (!publisher) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `Publisher not found` });

    const token = jwt.sign({ _id: user._id.toString() }, SECRET, { expiresIn: AUTH_TOKEN_EXPIRATION });
    return res.status(200).send({ ok: true, data: { user, publisher, token } });
  } catch (error) {
    next(error);
  }
});

router.post("/invite", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: bodyError, value: body } = Joi.object({
      firstname: Joi.string().required(),
      lastname: Joi.string(),
      email: Joi.string().email().required(),
      publishers: Joi.array().items(Joi.string()).min(1).required(),
      role: Joi.string().valid("admin", "user").default("user"),
    })
      .unknown()
      .validate(req.body);

    if (bodyError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: bodyError.details });

    const exists = await UserModel.findOne({ email: body.email });
    if (exists) return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, message: `User already exists !` });

    const user = new UserModel({
      firstname: body.firstname,
      lastname: body.lastname,
      email: body.email,
      publishers: body.publishers,
      role: body.role,
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
    const { error: bodyError, value: body } = Joi.object({
      token: Joi.string().required(),
    })
      .unknown()
      .validate(req.body);

    if (bodyError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: bodyError.details });

    const user = await UserModel.findOne({ invitationToken: body.token });
    if (!user) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    if (!user.invitationExpiresAt || user.invitationExpiresAt < new Date()) return res.status(403).send({ ok: false, code: REQUEST_EXPIRED, message: `Token expired` });

    return res.status(200).send({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-reset-password-token", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: bodyError, value: body } = Joi.object({
      token: Joi.string().required(),
    })
      .unknown()
      .validate(req.body);

    if (bodyError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: bodyError.details });

    const user = await UserModel.findOne({ forgot_password_reset_token: body.token });
    if (!user) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });

    if (!user.forgot_password_reset_expires || user.forgot_password_reset_expires < new Date()) {
      return res.status(403).send({ ok: false, code: REQUEST_EXPIRED, message: `Token expired` });
    }

    return res.status(200).send({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.post("/signup", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: bodyError, value: body } = Joi.object({
      id: Joi.string().required(),
      firstname: Joi.string().required(),
      lastname: Joi.string(),
      password: Joi.string()
        .required()
        .min(12)
        .max(100)
        .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{12,30}$/),
    })
      .unknown()
      .validate(req.body);

    if (bodyError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: bodyError.details });

    const user = await UserModel.findById(body.id);
    if (!user) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });

    user.firstname = body.firstname;
    user.lastname = body.lastname;
    user.password = body.password;
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
    const { error: bodyError, value: body } = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    })
      .unknown()
      .validate(req.body);

    if (bodyError) return res.status(404).send({ ok: false, code: INVALID_BODY, message: bodyError.details });

    const start = Date.now();
    const user = await UserModel.findOne({ email: body.email });
    const match = user ? await user.comparePassword(body.password) : false;
    const delay = 1000 - (Date.now() - start);

    setTimeout(
      async () => {
        if (!user || !match) {
          return res.status(404).send({ ok: false, code: NOT_FOUND, message: `Incorrect email or password` });
        }

        const publisher = user.publishers.length ? await PublisherModel.findById(user.publishers[0]) : null;

        user.last_login_at = new Date();
        if (!user.login_at) user.login_at = [];
        user.login_at.push(new Date());
        await user.save();

        const token = jwt.sign({ _id: user.id }, SECRET, { expiresIn: AUTH_TOKEN_EXPIRATION });
        return res.status(200).send({ ok: true, data: { user, publisher, token } });
      },
      delay > 0 ? delay : 0,
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

    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });

    const user = await UserModel.findOne({ email: body.data.email });

    if (user) {
      user.forgot_password_reset_token = crypto.randomBytes(20).toString("hex");
      user.forgot_password_reset_expires = new Date(Date.now() + FORGET_PASSWORD_EXPIRATION);
      await user.save();

      await sendTemplate(5, {
        emailTo: [body.data.email],
        params: { link: `${APP_URL}/reset-password?token=${user.forgot_password_reset_token}` },
      });
    }
    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.put("/", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: bodyError, value: body } = Joi.object({
      firstname: Joi.string().required(),
      lastname: Joi.string(),
    })
      .unknown()
      .validate(req.body);

    if (bodyError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: bodyError.details });

    req.user.lastname = body.lastname;
    req.user.firstname = body.firstname;
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
        newPassword: zod
          .string()
          .min(12)
          .max(100)
          .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{12,30}$/),
      })
      .required()
      .safeParse(req.body);

    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });

    const match = await req.user.comparePassword(body.data.oldPassword);
    if (!match) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: `Old password is not correct` });

    req.user.password = body.data.newPassword;
    await req.user.save();

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.put("/reset-password", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: bodyError, value: body } = Joi.object({
      token: Joi.string().required(),
      password: Joi.string().required(),
    })
      .unknown()
      .validate(req.body);

    if (bodyError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: bodyError.details });

    const user = await UserModel.findOne({ forgot_password_reset_token: body.token });
    if (!user) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });

    if (!user.forgot_password_reset_expires || user.forgot_password_reset_expires < new Date())
      return res.status(403).send({ ok: false, code: REQUEST_EXPIRED, message: `Token expired` });

    user.password = body.password;
    user.forgot_password_reset_token = null;
    user.forgot_password_reset_expires = null;
    await user.save();

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.put("/:userId/reset-password", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      userId: Joi.string().required(),
    }).validate(req.params);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: paramsError.details });
    const user = await UserModel.findById(params.userId);
    if (!user) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });
    const password = Math.random().toString(36).slice(-8);
    user.password = password;
    await user.save();

    return res.status(200).send({ ok: true, data: password });
  } catch (error) {
    next(error);
  }
});

router.put("/:userId/invite-again", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      userId: Joi.string().required(),
    }).validate(req.params);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: paramsError.details });

    const user = await UserModel.findById(params.userId);
    if (!user) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });

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

router.put("/:userId", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      userId: Joi.string().required(),
    }).validate(req.params);

    const { error: bodyError, value: body } = Joi.object({
      firstname: Joi.string().allow("").optional(),
      lastname: Joi.string().allow("").optional(),
      email: Joi.string().email().allow("").optional(),
      publishers: Joi.array().items(Joi.string()).min(1).optional(),
      role: Joi.string().valid("admin", "user").default("user"),
    })
      .unknown()
      .validate(req.body);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: paramsError.details });
    if (bodyError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: bodyError.details });

    const user = await UserModel.findById(params.userId);
    if (!user) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });

    user.lastname = body.lastname;
    if (body.firstname) user.firstname = body.firstname;
    if (body.email) user.email = body.email;
    if (body.publishers) user.publishers = body.publishers;
    if (body.role) user.role = body.role;
    await user.save();

    res.status(200).send({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.delete("/:userId", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      userId: Joi.string().required(),
    }).validate(req.params);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_BODY, message: paramsError.details });

    const user = await UserModel.findById(params.userId);
    if (!user) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `User not found` });

    user.deleted = true;
    await user.save();

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;

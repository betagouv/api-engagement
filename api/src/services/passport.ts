import * as Sentry from "@sentry/node";
import { Request } from "express";
import passport from "passport";
import { HeaderAPIKeyStrategy } from "passport-headerapikey";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";

import { SECRET } from "../config";
import { captureException } from "../error";
import PublisherModel from "../models/publisher";
import UserModel from "../models/user";

const userOptions = {
  jwtFromRequest: (req: Request) => ExtractJwt.fromAuthHeaderWithScheme("jwt")(req),
  secretOrKey: SECRET,
};

passport.use(
  "user",
  new JwtStrategy(userOptions, async (jwtPayload, done) => {
    try {
      if (!jwtPayload._id) return done(null, false);
      const user = await UserModel.findById({ _id: jwtPayload._id });
      if (user) {
        Sentry.setUser({ id: user._id.toString(), username: user.firstname + user.lastname, email: user.email });
        user.last_activity_at = new Date();
        await user.save();
        return done(null, user);
      }
    } catch (error) {
      captureException(error);
      return done(error, false);
    }
    return done(null, false);
  }),
);

passport.use(
  "admin",
  new JwtStrategy(userOptions, async (jwtPayload, done) => {
    try {
      if (!jwtPayload._id) return done(null, false);
      const user = await UserModel.findById({ _id: jwtPayload._id });
      if (user && user.role === "admin") {
        Sentry.setUser({ id: user._id.toString(), username: user.firstname + user.lastname, email: user.email });
        return done(null, user);
      }
    } catch (error) {
      captureException(error);
      return done(error, false);
    }
    return done(null, false);
  }),
);

passport.use(
  "apikey",
  new HeaderAPIKeyStrategy({ header: "apikey", prefix: "" }, false, async (apikey, done) => {
    try {
      const publisher = await PublisherModel.findOne({ apikey });
      if (publisher) {
        Sentry.setUser({ id: publisher._id.toString(), username: publisher.name, email: publisher.email });
        publisher.lastFetchAt = new Date();
        await publisher.save();
        return done(null, publisher);
      }
    } catch (error: any) {
      captureException(error);
      return done(error, false);
    }
    return done(null, false);
  }),
);

passport.use(
  "api",
  new HeaderAPIKeyStrategy({ header: "x-api-key", prefix: "" }, false, async (apikey, done) => {
    try {
      const publisher = await PublisherModel.findOne({ apikey });
      if (publisher) {
        Sentry.setUser({ id: publisher._id.toString(), username: publisher.name, email: publisher.email });
        publisher.lastFetchAt = new Date();
        await publisher.save();
        return done(null, publisher);
      }
    } catch (error: any) {
      captureException(error);
      return done(error, false);
    }
    return done(null, false);
  }),
);

passport.use(
  "process",
  new HeaderAPIKeyStrategy({ header: "x-api-key", prefix: "" }, false, async (apikey, done) => {
    try {
      const publisher = await PublisherModel.findOne({ apikey, name: "API Engagement" });
      if (publisher) {
        Sentry.setUser({ id: publisher._id.toString(), username: publisher.name, email: publisher.email });
        publisher.lastFetchAt = new Date();
        await publisher.save();
        return done(null, publisher);
      }
    } catch (error: any) {
      captureException(error);
      return done(error, false);
    }
    return done(null, false);
  }),
);

passport.use(
  "leboncoin",
  new HeaderAPIKeyStrategy({ header: "Authorization", prefix: "" }, false, async (apikey, done) => {
    try {
      const publisher = await PublisherModel.findOne({ apikey, name: "Le Bon Coin" });
      if (publisher) {
        Sentry.setUser({ id: publisher._id.toString(), username: publisher.name, email: publisher.email });
        publisher.lastFetchAt = new Date();
        await publisher.save();
        return done(null, publisher);
      }
    } catch (error: any) {
      captureException(error);
      return done(error, false);
    }
    return done(null, false);
  }),
);

export default passport;
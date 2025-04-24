import * as Sentry from "@sentry/node";
import { Request } from "express";
import passport from "passport";
import { HeaderAPIKeyStrategy } from "passport-headerapikey";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";

import { PublisherModel, UserModel } from "@shared/models";

import { SECRET } from "../config";
import { captureException } from "../error";

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
  "leboncoin",
  new HeaderAPIKeyStrategy({ header: "Authorization", prefix: "" }, false, async (apikey, done) => {
    try {
      const publisher = await PublisherModel.findOne({ apikey, _id: "60cd04a0d2321e05a743fa8d" });
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
  "jobteaser",
  new HeaderAPIKeyStrategy({ header: "x-api-key", prefix: "" }, false, async (apikey, done) => {
    try {
      const publisher = await PublisherModel.findOne({ apikey, _id: "66ffce58f95ec99387109053" });
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

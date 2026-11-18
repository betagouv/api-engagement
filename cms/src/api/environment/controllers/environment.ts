import type { Context } from "koa";

export default {
  get(ctx: Context) {
    ctx.body = { env: process.env.ENV ?? "development" };
  },
};

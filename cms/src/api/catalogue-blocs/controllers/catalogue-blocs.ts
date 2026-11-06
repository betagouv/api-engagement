import type { Context } from "koa";

// URL publique de plateform (même valeur que le `frame-src` de config/middlewares.ts).
const PLATEFORM_URL = process.env.PLATEFORM_URL || "http://localhost:3005";

export default {
  redirect(ctx: Context) {
    ctx.redirect(`${PLATEFORM_URL}/_cms/catalogue-blocs`);
  },
};

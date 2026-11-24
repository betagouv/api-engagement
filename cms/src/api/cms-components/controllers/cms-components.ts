import type { Context } from "koa";

// URL publique de plateform (même valeur que le `frame-src` de config/middlewares.ts).
const PLATEFORM_URL = process.env.PLATEFORM_URL || "http://localhost:3005";

export default {
  redirect(ctx: Context) {
    // `?bloc=blocks.hero` ouvre la doc d'un bloc précis (panneau « Documentation » de l'édition d'une page).
    const bloc = typeof ctx.query.bloc === "string" && /^[a-z-]+\.[a-z-]+$/.test(ctx.query.bloc) ? `?bloc=${ctx.query.bloc}` : "";
    ctx.redirect(`${PLATEFORM_URL}/_cms/components${bloc}`);
  },
};

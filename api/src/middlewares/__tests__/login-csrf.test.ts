import express, { Request, Response } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { loginCsrfProtection } from "@/middlewares/login-csrf";

vi.mock("@/config", () => ({ APP_URL: "https://app.example.test/backoffice" }));

describe("loginCsrfProtection", () => {
  const app = express();
  const handler = vi.fn((_req: Request, res: Response) => res.status(200).send({ ok: true }));
  app.post(["/login", "/login/mfa", "/login/mfa/resend"], loginCsrfProtection, handler);

  it.each(["/login", "/login/mfa", "/login/mfa/resend"])("autorise l'origine de l'app sur %s", async (path) => {
    const response = await request(app).post(path).set("Origin", "https://app.example.test").set("Cookie", "mfa_device=device-token").send({});

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  describe.each(["/login", "/login/mfa", "/login/mfa/resend"])("%s", (path) => {
    it.each([
      "https://attacker.example.test",
      "https://app.example.test.attacker.test",
      "https://app.example.test@attacker.test",
      "http://app.example.test",
      "https://app.example.test:444",
      "null",
      undefined,
    ])("refuse l'origine %s avant le traitement, avec ou sans cookie", async (origin) => {
      for (const withCookie of [false, true]) {
        const req = request(app).post(path).type("form");
        if (origin !== undefined) {
          req.set("Origin", origin);
        }
        if (withCookie) {
          req.set("Cookie", "mfa_device=device-token");
        }

        const response = await req.send({ email: "attacker@example.test", password: "password" });

        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({ ok: false, code: "FORBIDDEN" });
        expect(handler).not.toHaveBeenCalled();
      }
    });
  });
});

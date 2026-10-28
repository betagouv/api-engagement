import { describe, expect, it } from "vitest";
import { pageMeta } from "../seo";

describe("pageMeta", () => {
  it("déclare un canonical absolu pour une page indexable", () => {
    const meta = pageMeta({ pathname: "/" }, { title: "T" });
    expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: "https://trouvetamission.gouv.fr/" });
  });

  it("remplace le canonical par la consigne robots sur une page noindex", () => {
    const meta = pageMeta({ pathname: "/missions" }, { title: "T", robots: "noindex, follow" });
    expect(meta).toContainEqual({ name: "robots", content: "noindex, follow" });
    expect(meta.some((m) => "rel" in m && m.rel === "canonical")).toBe(false);
  });
});

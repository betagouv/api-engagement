import { describe, expect, it } from "vitest";
import * as utils from "@/jobs/letudiant/utils";

describe("decodeHtml", () => {
  it("should decode HTML entities", () => {
    const html = "Description with &lt;p&gt;html&lt;/p&gt; tags.";
    const decoded = utils.decodeHtml(html);
    expect(decoded).toBe("Description with <p>html</p> tags.");
  });

  it("should return the same string if no HTML entities are present", () => {
    const html = "Description with html tags.";
    const decoded = utils.decodeHtml(html);
    expect(decoded).toBe("Description with html tags.");
  });

  it("should return the same string if only & is present in HTML string", () => {
    const html = "<strong>Description with & tags.</strong>";
    const decoded = utils.decodeHtml(html);
    expect(decoded).toBe("<strong>Description with & tags.</strong>");
  });
});

import { describe, expect, it } from "vitest";
import { ExtractLinkedinReportLinkParams, extractLinkedinReportLink } from "../link-extractor";

const email: ExtractLinkedinReportLinkParams = {
  mdTextBody: "",
  rawHtmlBody: "",
  rawTextBody: "",
};

describe("extractLinkedinReportLink", () => {
  it("returns the link from markdown content", () => {
    const md = "[Download report](https://www.linkedin.com/e/v2?foo=bar&baz=qux)";

    expect(extractLinkedinReportLink({ ...email, mdTextBody: md })).toEqual("https://www.linkedin.com/e/v2?foo=bar&baz=qux");
  });

  it("prefers the link from the raw md when both sources contain one", () => {
    const raw = '<a href="https://www.linkedin.com/e/v2?foo=bar&amp;baz=qux">Download report</a>';
    const md = "[Download report](https://www.linkedin.com/e/v2?fallback=1)";

    expect(extractLinkedinReportLink({ ...email, rawHtmlBody: raw, mdTextBody: md })).toEqual("https://www.linkedin.com/e/v2?fallback=1");
  });

  it("extracts a bare linkedin link from the raw body", () => {
    const raw = `Monique Bayama shared Report Quentin  with you
        <a href="https://www.linkedin.com/e/v2?urlhash=B3V8&amp;url=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Ftalent%2Freporting%2Fapi%2FtalentReportRedirect%3Fexport%3Dc65eb0b8-2c6b-4c95-a19e-74f37b99d54d_12%26handle%3D9350534891%26sig%3DMDIxpZsKqK9gc2mAsICtyYbX3SfcgB3i3WlOBzbGSaVzRyw%253D&amp;lipi=urn%3Ali%3Apage%3Aemail_email_hp_reporting_scheduled_job_01%3BSxbfVYh7SNqYFiO5TOupvg%3D%3D&amp;midToken=AQFmrFVhGEd36Q&amp;midSig=1Yfu0o14c8WXY1&amp;ek=email_hp_reporting_scheduled_job_01&amp;e=ckuay3-mh4fz5ml-5c&amp;eid=ckuay3-mh4fz5ml-5c&amp;m=null&amp;ts=null&amp;li=0&amp;t=plh" target="_blank" style="color: #0a66c2; cursor: pointer; display: inline-block; text-decoration: none; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;"></a>  
        * This download link is unique to you and will expire in 14 days, please do not forward it to untrusted contacts
`;

    expect(extractLinkedinReportLink({ ...email, rawTextBody: raw })).toEqual(
      "https://www.linkedin.com/e/v2?urlhash=B3V8&url=https%3A%2F%2Fwww%2Elinkedin%2Ecom%2Ftalent%2Freporting%2Fapi%2FtalentReportRedirect%3Fexport%3Dc65eb0b8-2c6b-4c95-a19e-74f37b99d54d_12%26handle%3D9350534891%26sig%3DMDIxpZsKqK9gc2mAsICtyYbX3SfcgB3i3WlOBzbGSaVzRyw%253D&lipi=urn%3Ali%3Apage%3Aemail_email_hp_reporting_scheduled_job_01%3BSxbfVYh7SNqYFiO5TOupvg%3D%3D&midToken=AQFmrFVhGEd36Q&midSig=1Yfu0o14c8WXY1&ek=email_hp_reporting_scheduled_job_01&e=ckuay3-mh4fz5ml-5c&eid=ckuay3-mh4fz5ml-5c&m=null&ts=null&li=0&t=plh"
    );
  });

  it("returns null when no link is found", () => {
    expect(
      extractLinkedinReportLink({
        ...email,
        rawHtmlBody: "Pas de lien ici",
        mdTextBody: "- Lien: aucun",
      })
    ).toBeNull();
  });
});

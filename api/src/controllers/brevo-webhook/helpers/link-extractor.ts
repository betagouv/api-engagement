export interface ExtractLinkedinReportLinkParams {
  rawHtmlBody?: string;
  rawTextBody?: string;
  mdTextBody?: string;
}

const LINK_PATTERNS: RegExp[] = [
  /\[Download report\]\((https:\/\/www\.linkedin\.com\/[^\s)]+)\)/i,
  /href=["'](https:\/\/www\.linkedin\.com\/e\/v2[^"']+)["']/i,
  /(https:\/\/www\.linkedin\.com\/e\/v2[^\s"'<>]+)/i,
];

export const extractLinkedinReportLink = ({ rawHtmlBody, rawTextBody, mdTextBody }: ExtractLinkedinReportLinkParams): string | null => {
  const sanitizeMatch = (match: RegExpMatchArray | null) => {
    if (!match) {
      return null;
    }

    const candidate = match[1] ?? match[0];
    if (!candidate) {
      return null;
    }

    return candidate.replace(/&amp;/g, "&");
  };

  const candidates = [rawTextBody, mdTextBody, rawHtmlBody];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    for (const pattern of LINK_PATTERNS) {
      const match = candidate.match(pattern);
      const sanitized = sanitizeMatch(match);
      if (sanitized) {
        return sanitized;
      }
    }
  }

  return null;
};

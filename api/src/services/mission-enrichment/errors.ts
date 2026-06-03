export class MissionEnrichmentRateLimitError extends Error {
  constructor() {
    super("Rate limit reached");
    this.name = "MissionEnrichmentRateLimitError";
  }
}

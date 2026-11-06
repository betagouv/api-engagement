// Limiteur de débit par tokens sur une fenêtre glissante d'une minute.
// Le TPM OpenAI comptabilise input + tokens de sortie réservés : une requête qui excède
// à elle seule la limite ne peut pas être « retentée », il faut donc plafonner sa taille
// en amont (voir generator.ts) et espacer les requêtes successives ici.
export class TokenRateLimiter {
  private readonly windowMs = 60_000;
  private events: { at: number; tokens: number }[] = [];

  constructor(private readonly tokensPerMinute: number) {}

  // Attend, si nécessaire, que la fenêtre glissante laisse la place à `tokens`, puis réserve.
  async reserve(tokens: number): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.events = this.events.filter((event) => now - event.at < this.windowMs);
      const used = this.events.reduce((sum, event) => sum + event.tokens, 0);
      // Si la fenêtre est vide on laisse passer même une requête surdimensionnée (évite tout blocage).
      if (this.events.length === 0 || used + tokens <= this.tokensPerMinute) break;
      const waitMs = this.windowMs - (now - this.events[0].at);
      await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 250)));
    }
    this.events.push({ at: Date.now(), tokens });
  }
}

// Estimation volontairement pessimiste (~3 chars/token) pour rester sous la limite réelle.
export const estimateTokens = (chars: number, reservedOutputTokens: number): number => Math.ceil(chars / 3) + reservedOutputTokens;

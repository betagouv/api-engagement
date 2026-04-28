import { useState } from "react";
import type { MatchResultItem, MissionDetail } from "../api";

function Accordion({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={styles.valuesDetails}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={styles.accordionBtn}>
        <span
          style={{
            ...styles.accordionArrow,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
        {label}
      </button>
      {open && <div style={styles.accordionBody}>{children}</div>}
    </div>
  );
}

type Props = {
  items: MatchResultItem[];
  tookMs: number;
  userScoringId: string;
  selectedTaxonomies: string[];
  onBack: () => void;
};

function scoreColor(score: number): string {
  if (score >= 0.7) return "#16a34a";
  if (score >= 0.4) return "#d97706";
  return "#dc2626";
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(decimals);
}

export function MatchResults({ items, tookMs, userScoringId, selectedTaxonomies, onBack }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Retour au quiz</button>
        <div style={styles.meta}>
          <span style={styles.metaChip}>{items.length} mission{items.length !== 1 ? "s" : ""}</span>
          <span style={styles.metaChip}>{tookMs} ms</span>
          <span style={{ ...styles.metaChip, fontSize: 11, color: "#9ca3af" }} title={userScoringId}>
            scoring: {userScoringId.slice(0, 8)}…
          </span>
        </div>
      </div>

      {items.length === 0 && (
        <div style={styles.empty}>Aucune mission trouvée pour ce profil.</div>
      )}

      <div style={styles.list}>
        {items.map((item, idx) => (
          <MissionCard key={item.missionId} item={item} rank={idx + 1} selectedTaxonomies={selectedTaxonomies} />
        ))}
      </div>
    </div>
  );
}

function MissionCard({ item, rank, selectedTaxonomies }: { item: MatchResultItem; rank: number; selectedTaxonomies: string[] }) {
  // Dériver les scores depuis values si taxonomyScores est vide
  const allTaxonomyScores: Record<string, number> =
    Object.keys(item.taxonomyScores).length > 0
      ? (item.taxonomyScores as Record<string, number>)
      : item.values.reduce<Record<string, number>>((acc, v) => {
          if (acc[v.taxonomyKey] === undefined || v.scoringScore > acc[v.taxonomyKey]) {
            acc[v.taxonomyKey] = v.scoringScore;
          }
          return acc;
        }, {});

  // Filtrer aux seules taxonomies sélectionnées par l'utilisateur (si connues)
  const taxonomyScores =
    selectedTaxonomies.length > 0
      ? Object.fromEntries(Object.entries(allTaxonomyScores).filter(([taxonomy]) => selectedTaxonomies.includes(taxonomy)))
      : allTaxonomyScores;

  const hasTaxonomyScores = Object.keys(taxonomyScores).length > 0;
  const isFake = item.isFake;

  return (
    <div style={{ ...styles.card, ...(isFake ? styles.cardFake : {}) }}>
      <div style={styles.cardHeader}>
        <div style={styles.rankBadge}>#{rank}</div>
        <div style={styles.missionInfo}>
          <div style={styles.missionTitle}>
            {item.title}
            {isFake && <span style={styles.fakeBadge}>FAKE</span>}
          </div>
          <div style={styles.missionCity}>
            {[item.publisherName, item.city].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div
          style={{
            ...styles.scoreBadge,
            background: scoreColor(item.totalScore),
          }}
        >
          {(item.totalScore * 100).toFixed(0)}
        </div>
      </div>

      <div style={styles.scoreRow}>
        <ScoreChip label="taxonomy" value={item.taxonomyScore} />
        <ScoreChip label="geo" value={item.geoScore} />
        {item.distanceKm !== null && (
          <span style={styles.chip}>{fmt(item.distanceKm, 1)} km</span>
        )}
      </div>

      {hasTaxonomyScores && (
        <div style={styles.taxonomyScores}>
          {Object.entries(taxonomyScores)
            .filter(([, score]) => score !== undefined && score > 0)
            .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
            .map(([taxonomy, score]) => (
              <div key={taxonomy} style={styles.taxonomyRow}>
                <span style={styles.taxonomyKey}>{taxonomy}</span>
                <div style={styles.taxonomyBar}>
                  <div
                    style={{
                      ...styles.taxonomyBarFill,
                      width: `${((score ?? 0) * 100).toFixed(0)}%`,
                      background: scoreColor(score ?? 0),
                    }}
                  />
                </div>
                <span style={styles.taxonomyScore}>{fmt(score)}</span>
              </div>
            ))}
        </div>
      )}

      {!hasTaxonomyScores && item.values.length === 0 && (
        <div style={styles.noTaxonomyScores}>Aucun score de taxonomie disponible</div>
      )}

      {item.mission && <MissionDetailAccordion mission={item.mission} />}

      {item.values.length > 0 && (() => {
        const enrichedValues = item.values.filter((v) => v.enrichmentConfidence > 0 || v.evidence !== null);
        if (enrichedValues.length === 0) return null;
        return (
        <Accordion label={`Enrichissement (${enrichedValues.length} valeur${enrichedValues.length !== 1 ? "s" : ""})`}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Taxonomie</th>
                <th style={styles.th}>Valeur</th>
                <th style={styles.th}>Confiance</th>
              </tr>
            </thead>
            <tbody>
              {enrichedValues
                .sort((a, b) => b.enrichmentConfidence - a.enrichmentConfidence)
                .map((v, i) => {
                  const evidenceTooltip = v.evidence
                    ? JSON.stringify(v.evidence, null, 2)
                    : undefined;
                  return (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{v.taxonomyKey}</td>
                      <td style={styles.td}>{v.taxonomyValueLabel}</td>
                      <td
                        style={{ ...styles.td, color: scoreColor(v.enrichmentConfidence), cursor: evidenceTooltip ? "help" : "default" }}
                        title={evidenceTooltip}
                      >
                        {fmt(v.enrichmentConfidence)}
                        {evidenceTooltip && <span style={styles.evidenceHint}>ⓘ</span>}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Accordion>
        );
      })()}
    </div>
  );
}

function MissionDetailAccordion({ mission }: { mission: MissionDetail }) {
  const metaItems: { label: string; value: string }[] = [
    mission.domainOriginal ? { label: "Domaine", value: mission.domainOriginal } : null,
    mission.type ? { label: "Type", value: mission.type } : null,
    mission.remote ? { label: "Remote", value: mission.remote } : null,
    mission.duration != null ? { label: "Durée", value: `${mission.duration}h` } : null,
    mission.schedule ? { label: "Rythme", value: mission.schedule } : null,
    mission.startAt ? { label: "Début", value: new Date(mission.startAt).toLocaleDateString("fr-FR") } : null,
    mission.endAt ? { label: "Fin", value: new Date(mission.endAt).toLocaleDateString("fr-FR") } : null,
    mission.openToMinors != null ? { label: "Mineurs", value: mission.openToMinors ? "Oui" : "Non" } : null,
    mission.reducedMobilityAccessible != null ? { label: "Accessibilité PMR", value: mission.reducedMobilityAccessible ? "Oui" : "Non" } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);

  const textSections: { label: string; content: string }[] = [
    mission.description ? { label: "Description", content: mission.description } : null,
    mission.tasks.length > 0 ? { label: "Tâches", content: mission.tasks.join("\n") } : null,
    mission.audience.length > 0 ? { label: "Public", content: mission.audience.join("\n") } : null,
    mission.softSkills.length > 0 ? { label: "Savoir-être", content: mission.softSkills.join("\n") } : null,
    mission.requirements.length > 0 ? { label: "Prérequis", content: mission.requirements.join("\n") } : null,
  ].filter((x): x is { label: string; content: string } => x !== null);

  return (
    <Accordion label="Détail mission">
      <div style={styles.missionDetail}>
        {metaItems.length > 0 && (
          <div style={styles.metaGrid}>
            {metaItems.map(({ label, value }) => (
              <div key={label} style={styles.metaItem}>
                <span style={styles.metaItemLabel}>{label}</span>
                <span style={styles.metaItemValue}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {mission.tags.length > 0 && (
          <div style={styles.tagsRow}>
            {mission.tags.map((tag) => (
              <span key={tag} style={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        {textSections.map(({ label, content }) => (
          <div key={label} style={styles.textSection}>
            <div style={styles.textSectionLabel}>{label}</div>
            <div style={styles.textSectionContent}>{content}</div>
          </div>
        ))}
      </div>
    </Accordion>
  );
}

function ScoreChip({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <span style={{ ...styles.chip, color: scoreColor(value) }}>
      {label}: {fmt(value)}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    background: "none",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 13,
    color: "#374151",
  },
  meta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  metaChip: {
    fontSize: 12,
    background: "#f3f4f6",
    borderRadius: 12,
    padding: "3px 10px",
    color: "#6b7280",
  },
  empty: {
    color: "#6b7280",
    textAlign: "center",
    padding: 40,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 16,
    background: "#fff",
  },
  cardFake: {
    border: "1px solid #fbbf24",
    background: "#fffbeb",
  },
  fakeBadge: {
    marginLeft: 8,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    background: "#fbbf24",
    color: "#78350f",
    borderRadius: 4,
    padding: "1px 6px",
    verticalAlign: "middle",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  rankBadge: {
    background: "#f3f4f6",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    flexShrink: 0,
  },
  missionInfo: {
    flex: 1,
    minWidth: 0,
  },
  missionTitle: {
    fontWeight: 600,
    fontSize: 15,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  missionCity: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  scoreBadge: {
    color: "#fff",
    borderRadius: 8,
    padding: "4px 10px",
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
  },
  scoreRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  chip: {
    fontSize: 12,
    background: "#f3f4f6",
    borderRadius: 12,
    padding: "3px 10px",
    color: "#374151",
  },
  taxonomyScores: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 10,
  },
  taxonomyRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  taxonomyKey: {
    fontSize: 11,
    color: "#6b7280",
    width: 160,
    flexShrink: 0,
  },
  taxonomyBar: {
    flex: 1,
    height: 6,
    background: "#f3f4f6",
    borderRadius: 3,
    overflow: "hidden",
  },
  taxonomyBarFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.3s ease",
  },
  taxonomyScore: {
    fontSize: 11,
    color: "#374151",
    width: 36,
    textAlign: "right",
    flexShrink: 0,
  },
  noTaxonomyScores: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
    marginBottom: 8,
  },
  valuesDetails: {
    marginTop: 8,
  },
  accordionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    padding: "2px 0",
    cursor: "pointer",
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "inherit",
  },
  accordionArrow: {
    fontSize: 9,
    color: "#9ca3af",
    transition: "transform 0.15s ease",
    display: "inline-block",
  },
  accordionBody: {
    marginTop: 6,
  },
  evidenceHint: {
    marginLeft: 4,
    fontSize: 10,
    color: "#9ca3af",
    verticalAlign: "middle",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 8,
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    padding: "4px 8px",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    fontWeight: 600,
  },
  td: {
    padding: "4px 8px",
    color: "#374151",
  },
  trEven: {
    background: "#f9fafb",
  },
  trOdd: {
    background: "#fff",
  },
  missionDetail: {
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  metaGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  metaItem: {
    display: "flex",
    flexDirection: "column",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "4px 10px",
    minWidth: 80,
  },
  metaItemLabel: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  metaItemValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: 500,
  },
  tagsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    fontSize: 11,
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    padding: "2px 8px",
  },
  textSection: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  textSectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  textSectionContent: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap" as const,
    maxHeight: 120,
    overflow: "auto",
    background: "#f9fafb",
    borderRadius: 6,
    padding: "6px 10px",
  },
};

import Modal from "~/components/layout/modal";
import type { MatchResultItem } from "~/types/matching";
import "./MatchingDebugModal.css";

const formatScore = (score: number | null): string => (score === null ? "—" : score.toFixed(3));

export type MatchingDebugUserValue = {
  taxonomyKey: string;
  taxonomyValueKey: string;
  taxonomyValueLabel: string;
  userScore: number;
};

interface Props {
  item: MatchResultItem | null;
  userValues: MatchingDebugUserValue[];
  onClose: () => void;
}

export default function MatchingDebugModal({ item, userValues, onClose }: Props) {
  return (
    <Modal open={item !== null} onClose={onClose} title="Debug matching">
      {item && (
        <div className="matching-debug flex flex-col gap-6">
          <section>
            <h3 className="matching-debug__title">Score global</h3>
            <table className="matching-debug__table">
              <tbody>
                <tr>
                  <th scope="row">Score total</th>
                  <td>{formatScore(item.match.totalScore)}</td>
                </tr>
                <tr>
                  <th scope="row">Score taxonomie</th>
                  <td>{formatScore(item.match.taxonomyScore)}</td>
                </tr>
                <tr>
                  <th scope="row">Score géo</th>
                  <td>{formatScore(item.match.geoScore)}</td>
                </tr>
                <tr>
                  <th scope="row">Mission scoring ID</th>
                  <td>{item.match.missionScoringId}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="matching-debug__title">Scores par taxonomie</h3>
            <div className="matching-debug__table-wrapper">
              <table className="matching-debug__table">
                <thead>
                  <tr>
                    <th scope="col">Taxonomie</th>
                    <th scope="col">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(item.match.taxonomyScores).length > 0 ? (
                    Object.entries(item.match.taxonomyScores).map(([taxonomy, score]) => (
                      <tr key={taxonomy}>
                        <td>{taxonomy}</td>
                        <td>{formatScore(score)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2}>Aucun score par taxonomie.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="matching-debug__title">Score user</h3>
            <div className="matching-debug__table-wrapper">
              <table className="matching-debug__table">
                <thead>
                  <tr>
                    <th scope="col">Taxonomie</th>
                    <th scope="col">Valeur user</th>
                    <th scope="col">Score user</th>
                  </tr>
                </thead>
                <tbody>
                  {userValues.length > 0 ? (
                    userValues.map((value) => (
                      <tr key={`${value.taxonomyKey}-${value.taxonomyValueKey}`}>
                        <td>{value.taxonomyKey}</td>
                        <td>{value.taxonomyValueLabel}</td>
                        <td>{formatScore(value.userScore)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>Aucune valeur user.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="matching-debug__title">Valeurs taxonomiques de la mission</h3>
            <div className="matching-debug__table-wrapper">
              <table className="matching-debug__table">
                <thead>
                  <tr>
                    <th scope="col">Taxonomie</th>
                    <th scope="col">Valeur</th>
                    <th scope="col">Score</th>
                    <th scope="col">Confiance</th>
                  </tr>
                </thead>
                <tbody>
                  {item.match.values.length > 0 ? (
                    item.match.values.map((value) => (
                      <tr key={`${value.taxonomyKey}-${value.taxonomyValueKey}`}>
                        <td>{value.taxonomyKey}</td>
                        <td>{value.taxonomyValueLabel}</td>
                        <td>{formatScore(value.scoringScore)}</td>
                        <td>{formatScore(value.enrichmentConfidence)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>Aucune valeur explicative.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}

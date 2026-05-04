import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Modal from "~/components/layout/modal";
import { useQuizStore } from "~/stores/quiz";

interface ExitModalProps {
  className?: string;
}

export default function ExitModal({ className }: ExitModalProps) {
  const navigate = useNavigate();
  const answers = useQuizStore((s) => s.answers);
  const [exitOpen, setExitOpen] = useState(false);
  const handleClose = () => {
    if (answers.age) {
      setExitOpen(true);
    } else {
      navigate("/");
    }
  };
  return (
    <>
      <button type="button" onClick={handleClose} title="Fermer" aria-label="Fermer" aria-controls="exit-modal" className={className} />

      <Modal open={exitOpen} onClose={() => setExitOpen(false)} title="Quitter le questionnaire ?" id="exit-modal">
        <p className="mb-2!">Si tu quittes maintenant, ta progression ne sera pas enregistrée.</p>
        <p className="mb-6!">Tu peux retourner à l'accueil ou voir directement toutes les missions.</p>
        <div className="flex justify-end gap-3 flex-wrap">
          <Link to="/" className="fr-btn fr-btn--secondary">
            Retourner à l'accueil
          </Link>
          <Link to="/quiz/results" className="fr-btn">
            Voir toutes les missions
          </Link>
        </div>
      </Modal>
    </>
  );
}

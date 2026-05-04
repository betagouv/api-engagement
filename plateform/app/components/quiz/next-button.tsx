import { useNavigate } from "react-router";

interface NextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void;
  skip?: boolean;
}

export default function NextButton({ onClick, skip = false, ...props }: NextButtonProps) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <button type="button" onClick={onClick} className="fr-btn fr-btn--lg" {...props}>
        Continuer
      </button>
      {skip && (
        <button type="button" onClick={() => navigate("/quiz/results")} className="fr-btn fr-btn--lg fr-btn--tertiary">
          Voir les missions sans répondre à toutes les questions
        </button>
      )}
    </div>
  );
}

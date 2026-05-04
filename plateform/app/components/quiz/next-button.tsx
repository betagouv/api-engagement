import { useNavigate } from "react-router";

interface NextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
  skip?: boolean;
}

export default function NextButton({ onClick, skip = false, ...props }: NextButtonProps) {
  const navigate = useNavigate();
  return (
    <>
      {skip && (
        <button type="button" onClick={() => navigate("/quiz/results")} className="fr-btn fr-btn--lg fr-btn--tertiary md:hidden! w-full! justify-center!">
          Voir les missions sans répondre à toutes les questions
        </button>
      )}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-4 md:static md:bg-transparent md:p-0 md:flex md:flex-row md:gap-6">
        <button type="button" onClick={onClick} className="fr-btn fr-btn--lg w-full! justify-center! md:w-auto!" {...props}>
          Continuer
        </button>
        {skip && (
          <button type="button" onClick={() => navigate("/quiz/results")} className="fr-btn fr-btn--lg fr-btn--tertiary hidden! md:inline-flex!">
            Voir les missions sans répondre à toutes les questions
          </button>
        )}
      </div>
    </>
  );
}

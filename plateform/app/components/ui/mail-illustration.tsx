import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import TraceSvg from "~/assets/svg/trace.svg";

interface MailIllustrationProps {
  className?: string;
}

export default function MailIllustration({ className }: MailIllustrationProps) {
  return (
    <div className={className ? `${className}` : ""}>
      <img src={TraceSvg} alt="Trace" className="absolute top-20 left-0 w-1/5" />
      <div className="fr-container py-6! md:py-12! px-6! flex flex-col md:flex-row gap-4 md:gap-2 items-center justify-center">
        <div className="flex-1 z-10" aria-hidden="true">
          <div className="flex items-center justify-center gap-4">
            <img src={MailSendSvg} alt="" className="hidden md:block rotate-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

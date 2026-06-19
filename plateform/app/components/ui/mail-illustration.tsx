import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import TraceSvg from "~/assets/svg/trace.svg";

interface MailIllustrationProps {
  className?: string;
}

export default function MailIllustration({ className }: MailIllustrationProps) {
  return (
    <div className={`relative flex items-center justify-center${className ? ` ${className}` : ""}`} aria-hidden="true">
      <img src={TraceSvg} alt="" className="absolute top-0 left-0 w-[60%] opacity-60" />
      <img src={MailSendSvg} alt="" className="-rotate-[11deg] w-[113px] relative z-10" />
    </div>
  );
}

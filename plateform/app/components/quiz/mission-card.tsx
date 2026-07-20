import AscLogo from "~/assets/images/asc-logo.png";

type MissionCardProps = {
  imageSrc: string;
  category?: string;
  title: string;
  size?: "sm" | "md";
  className?: string;
};

export default function MissionCard({ imageSrc, category = "Solidarité", title, size = "md", className = "" }: MissionCardProps) {
  return (
    <div
      className={`bg-background rounded-xl shadow-md p-2 gap-2 flex flex-col ${size === "sm" ? "w-60 min-h-72 md:w-60 md:min-h-72" : "w-56 min-h-72 md:w-72 md:min-h-80"} ${className}`}
    >
      <div className="relative flex-1">
        <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover rounded" />
        <span className="absolute top-2 left-2 px-1 py-0.5 rounded-full text-xs leading-none font-semibold bg-blue-france-950 text-blue-france-sun">{category}</span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="fr-text font-bold mb-0!">{title}</p>
        <div className="fr-text--xs flex items-center gap-2 m-0!">
          <img src={AscLogo} alt="" className="block w-8" aria-hidden="true" />
          <span>Service Civique</span>
        </div>
      </div>
    </div>
  );
}

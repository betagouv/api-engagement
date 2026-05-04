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
    <div className={`bg-white rounded-xl shadow-md overflow-hidden p-2 gap-2 flex flex-col ${size === "sm" ? "w-60" : "w-72"} ${className}`}>
      <div className="relative">
        <img src={imageSrc} alt="" className={`block w-full object-cover rounded ${size === "sm" ? "h-40" : "h-72"}`} />
        <span className="absolute top-2 left-2 px-1 py-0.5 rounded-full text-[10px] leading-none font-semibold bg-blue-france-950 text-blue-france-sun">{category}</span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="fr-text font-bold mb-0!">{title}</p>
        <div className="fr-text--xs flex items-center gap-2 m-0!">
          <img src={AscLogo} className="block w-8" aria-hidden="true" />
          <span>Service Civique</span>
        </div>
      </div>
    </div>
  );
}

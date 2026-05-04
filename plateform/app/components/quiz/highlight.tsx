type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function Highlight({ className = "bg-blue-france-950", children }: Props) {
  return (
    <span className="relative inline-block px-2">
      <span aria-hidden className={`absolute inset-x-0 top-[40%] bottom-[10%] rounded-md ${className}`} />
      <span className="relative">{children}</span>
    </span>
  );
}

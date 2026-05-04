type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function Highlight({ className = "tw:bg-blue-france-950", children }: Props) {
  return (
    <span className="tw:relative tw:inline-block tw:px-2">
      <span aria-hidden className={`tw:absolute tw:inset-x-0 tw:top-[40%] tw:bottom-[10%] tw:rounded-md ${className}`} />
      <span className="tw:relative">{children}</span>
    </span>
  );
}

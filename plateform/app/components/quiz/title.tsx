type Props = {
  subtitle?: string;
  children: React.ReactNode;
};

export default function Title({ subtitle, children }: Props) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <h1 className="fr-h1 tw:mb-0!">{children}</h1>
      {subtitle && <p className="fr-text--lead">{subtitle}</p>}
    </div>
  );
}

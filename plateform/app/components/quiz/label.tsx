type Props = {
  subtitle?: string;
  children: React.ReactNode;
  htmlFor?: string;
};

export default function Label({ subtitle, children, htmlFor }: Props) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <label className="fr-h1 tw:mb-0!" htmlFor={htmlFor}>
        {children}
      </label>
      {subtitle && <p className="fr-text--lead">{subtitle}</p>}
    </div>
  );
}

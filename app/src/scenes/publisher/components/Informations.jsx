import LabelledInput from "@/components/form/LabelledInput";
import LabelledTextarea from "@/components/form/LabelledTextarea";

const Informations = ({ values, onChange }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Informations</h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-2">
        <LabelledInput id="name" label="Nom" value={values.name} onChange={(e) => onChange({ ...values, name: e.target.value })} />
        <LabelledInput id="email" label="Email de contact" value={values.email} onChange={(e) => onChange({ ...values, email: e.target.value })} />
        <LabelledInput id="url" label="URL" value={values.url} onChange={(e) => onChange({ ...values, url: e.target.value })} />
        <LabelledInput id="documentation" label="Documentation" value={values.documentation} onChange={(e) => onChange({ ...values, documentation: e.target.value })} />
        <LabelledTextarea id="description" label="Description" value={values.description} onChange={(e) => onChange({ ...values, description: e.target.value })} rows={4} />
      </div>
    </div>
  );
};

export default Informations;

const Informations = ({ values, onChange, disabled = true }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Informations</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-8">
        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor="name">
            Nom
            <span className="text-red-marianne ml-1">*</span>
          </label>
          <input id="name" className="input" name="name" disabled={disabled} value={values.name} onChange={(e) => onChange({ ...values, name: e.target.value })} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor="email">
            Email de contact
          </label>
          <input id="email" className="input" name="email" value={values.email} onChange={(e) => onChange({ ...values, email: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor="url">
            URL
          </label>
          <input id="url" className="input" name="url" value={values.url} onChange={(e) => onChange({ ...values, url: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor="documentation">
            Documentation
          </label>
          <input id="documentation" className="input" name="documentation" value={values.documentation} onChange={(e) => onChange({ ...values, documentation: e.target.value })} />
        </div>
        <div className="row-span-2 flex h-32 flex-col">
          <label className="mb-2 text-sm" htmlFor="documentation">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            className="input flex-1"
            name="description"
            placeholder="Description"
            value={values.description}
            onChange={(e) => onChange({ ...values, description: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};

export default Informations;

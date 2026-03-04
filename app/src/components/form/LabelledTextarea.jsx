const LabelledTextarea = ({ id, label, error, value, onChange, className, ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm" htmlFor={id}>
        {label}
      </label>
      <textarea id={id} className={`textarea ${error ? "border-b-error" : "border-b-black"} ${className}`} name={id} value={value} onChange={onChange} {...props} />
      {error && (
        <div className="text-error flex items-center text-sm">
          <RiErrorWarningFill className="mr-2" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
};

export default LabelledTextarea;

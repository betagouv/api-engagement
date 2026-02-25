const LabelledInput = ({ id, label, error, value, onChange, className, ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm" htmlFor={id}>
        {label}
      </label>
      <input id={id} className={`input ${error ? "border-b-error" : "border-b-black"} ${className}`} name={id} value={value} onChange={onChange} {...props} />
      {error && (
        <div className="text-error flex items-center text-sm">
          <RiErrorWarningFill className="mr-2" />
          {error}
        </div>
      )}
    </div>
  );
};

export default LabelledInput;

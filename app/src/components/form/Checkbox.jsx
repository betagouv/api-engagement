import { RiCheckFill } from "react-icons/ri";

const Checkbox = ({ id, label, error, value = false, onChange, className, ...props }) => {
  return (
    <div className="fr-checkbox-group relative flex items-center gap-2">
      <div className={`absolute flex h-6 w-6 items-center justify-center rounded-sm border border-black ${value ? "bg-blue-france" : "bg-white"}`}>
        {value && <RiCheckFill className="text-sm text-white" />}
      </div>
      <input
        name={id}
        id={id}
        checked={value}
        type="checkbox"
        aria-describedby={`${id}-messages`}
        className="absolute z-10 h-6 w-6 cursor-pointer appearance-none opacity-0"
        onChange={onChange}
        {...props}
      />
      <label htmlFor={id} className={`ml-8 flex cursor-pointer items-center text-base ${error ? "text-error" : "text-black"}`}>
        {label}
      </label>
      {error && (
        <div className="fr-messages-group" id={`${id}-messages`} aria-live="polite">
          <p className="fr-message--error">{error}</p>
        </div>
      )}
    </div>
  );
};

export default Checkbox;

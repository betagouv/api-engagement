const StickyBar = ({ visible, title, onSubmit, disabled }) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 z-50 w-full items-center bg-white px-4 py-4 shadow-lg">
      <div className="m-auto flex w-full items-center justify-between sm:w-[90%]">
        <p className="hidden text-2xl font-bold sm:block" aria-hidden="true">
          {title}
        </p>
        <button type="button" className="primary-btn" onClick={onSubmit} disabled={disabled}>
          Enregistrer
        </button>
      </div>
    </div>
  );
};

export default StickyBar;

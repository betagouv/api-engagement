import { useCallback, useEffect, useRef } from "react";
import { RiCloseFill } from "react-icons/ri";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Modal = ({ isOpen, children, onClose, className = "w-full max-w-3xl", wapperClassName = "w-full h-full", ariaLabelledBy }) => {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  const trapFocus = useCallback((e) => {
    if (e.key !== "Tab" || !dialogRef.current) {
      return;
    }
    const focusable = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      trapFocus(e);
    },
    [onClose, trapFocus],
  );

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      document.addEventListener("keydown", handleKeyDown);
      requestAnimationFrame(() => {
        const closeBtn = dialogRef.current?.querySelector("[data-modal-close]");
        if (closeBtn) {
          closeBtn.focus();
        }
      });
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (!isOpen && triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 z-50 flex h-full w-full items-center justify-center">
      <div className="fixed inset-0 z-0 overflow-y-auto bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={`${wapperClassName} absolute z-10 md:px-4`}
      >
        <div className={`${className} border-grey-border absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform overflow-y-auto border bg-white`}>
          <div className="relative h-full w-full">
            <button
              type="button"
              data-modal-close
              className="text-blue-france absolute top-2 right-2 flex cursor-pointer items-center p-3 text-sm"
              onClick={onClose}
              aria-label="Fermer"
            >
              <span className="leading-none" aria-hidden="true">Fermer</span>
              <RiCloseFill className="ml-2 inline text-sm" aria-hidden="true" />
            </button>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Modal;

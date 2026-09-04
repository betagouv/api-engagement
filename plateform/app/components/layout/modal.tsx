import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "~/hooks/useFocusTrap";

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  beforeTitle?: React.ReactNode;
  titleIcon?: string;
  className?: string;
  size?: "md" | "lg";
}

export default function Modal({ open, children, onClose, title, beforeTitle, titleIcon, className, size = "md", ...props }: ModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Le clic ne concerne que l'arrière-plan du dialogue, qui reste fermable au clavier via Échap et le bouton dédié.
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
      aria-hidden={!open}
      data-fr-opened={open}
      className={`fr-modal${open ? " fr-modal--opened" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      {...props}
    >
      <div className={`fr-container fr-container--fluid fr-container-md ${className}`}>
        <div className="fr-grid-row fr-grid-row--center">
          <div className={size === "lg" ? "fr-col-12 fr-col-md-10 fr-col-lg-8" : "fr-col-12 fr-col-md-8 fr-col-lg-6"}>
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button type="button" onClick={onClose} title="Fermer" aria-label="Fermer" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                {beforeTitle}
                <h2 id={titleId} className="fr-modal__title">
                  {titleIcon && <span className={`${titleIcon} fr-icon--lg`} aria-hidden="true" />}
                  {title}
                </h2>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

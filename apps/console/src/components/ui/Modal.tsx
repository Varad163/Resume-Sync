import type { ReactNode } from "react";

export interface ModalProps {
  title?: string;
  isOpen?: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ title, onClose, children, className = "" }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-card ${className}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button type="button" className="close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

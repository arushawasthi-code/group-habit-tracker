import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-border-warm w-full max-w-md mx-4 animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-border-warm">
          <h3 className="font-semibold text-charcoal font-display">{title}</h3>
          <button onClick={onClose} className="text-cocoa hover:text-charcoal transition-colors">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

export default function Modal({ title, eyebrow, onClose, children, footer, width = 560, dismissable = true }) {
  useEffect(() => {
    if (!dismissable) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, dismissable]);

  // Portal no body: dentro de uma seção animada (transform), `fixed` passaria a
  // valer em relação à seção e o modal ficaria cortado.
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-6 anim-fade"
      style={{ background: 'var(--c-void-veil)' }}
      onMouseDown={(e) => dismissable && e.target === e.currentTarget && onClose?.()}
    >
      <div className="card anim-rise flex flex-col max-h-full w-full shadow-2xl" style={{ maxWidth: width }}>
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-rule">
          <div>
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h2 className="font-display text-lg font-semibold">{title}</h2>
          </div>
          {dismissable && (
            <button className="btn btn-quiet btn-icon btn-sm" onClick={onClose} aria-label="Fechar">
              <X size={16} />
            </button>
          )}
        </header>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <footer className="flex justify-end gap-2 px-6 py-4 border-t border-rule">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Rótulo de botão que vira [ comando ] no estilo terminal */
export const Label = ({ children }) => <span className="btn-label">{children}</span>;

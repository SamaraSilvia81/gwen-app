import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, type = 'ok') => {
      const id = crypto.randomUUID();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), type === 'error' ? 7000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className="card glass anim-rise flex items-start gap-3 px-4 py-3 shadow-2xl">
            {t.type === 'error' ? (
              <WarningCircle size={18} className="text-ember shrink-0 mt-px" weight="bold" />
            ) : (
              <CheckCircle size={18} className="text-phosphor shrink-0 mt-px" weight="bold" />
            )}
            <p className="text-[13px] leading-snug flex-1">{t.message}</p>
            <button className="text-muted hover:text-bone" onClick={() => dismiss(t.id)} aria-label="Fechar">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

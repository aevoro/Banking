import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (options: { type: ToastType; title: string; description?: string }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, description }: { type: ToastType; title: string; description?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, description }]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string) => toast({ type: 'success', title, description }),
    [toast]
  );

  const error = useCallback(
    (title: string, description?: string) => toast({ type: 'error', title, description }),
    [toast]
  );

  const info = useCallback(
    (title: string, description?: string) => toast({ type: 'info', title, description }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-50 flex max-w-md flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all duration-200 bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800"
          >
            {item.type === 'success' && (
              <CheckCircle2
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            )}
            {item.type === 'error' && (
              <AlertCircle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600 dark:text-rose-400"
                aria-hidden="true"
              />
            )}
            {item.type === 'info' && (
              <Info
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
            )}
            <div className="flex-1 text-sm">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Закрыть уведомление"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

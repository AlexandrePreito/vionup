'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Rocket, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { setToastInstance } from '@/lib/toast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remover após 5 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const showSuccess = (message: string) => showToast(message, 'success');
  const showError = (message: string) => showToast(message, 'error');
  const showWarning = (message: string) => showToast(message, 'warning');
  const showInfo = (message: string) => showToast(message, 'info');

  // Expor instância para uso global
  useEffect(() => {
    setToastInstance({ showToast, showSuccess, showError, showWarning, showInfo });
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <div className="fixed top-20 right-6 z-50 space-y-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-white" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-white" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-white" />;
      default:
        return <Info className="w-5 h-5 text-white" />;
    }
  };

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
          border: 'border-emerald-400',
          shadow: 'shadow-lg shadow-emerald-500/25',
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-red-600',
          border: 'border-red-400',
          shadow: 'shadow-lg shadow-red-500/25',
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
          border: 'border-amber-400',
          shadow: 'shadow-lg shadow-amber-500/25',
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          border: 'border-blue-400',
          shadow: 'shadow-lg shadow-blue-500/25',
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`${colors.bg} ${colors.border} ${colors.shadow} border-2 rounded-xl p-4 min-w-[320px] max-w-md flex items-start gap-3 animate-slide-in-right`}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      {/* Ícone do foguete ou tipo */}
      <div className="flex-shrink-0">
        {toast.type === 'info' ? (
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Rocket className="w-4 h-4 text-white transform -rotate-45" />
          </div>
        ) : (
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            {getIcon()}
          </div>
        )}
      </div>

      {/* Mensagem */}
      <div className="flex-1">
        <p className="text-white font-medium text-sm leading-relaxed">{toast.message}</p>
      </div>

      {/* Botão fechar */}
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
        aria-label="Fechar"
      >
        <XCircle className="w-4 h-4" />
      </button>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Helper para usar toast fora de componentes React
// Para usar dentro de componentes, use o hook useToast()

let toastInstance: {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
} | null = null;

export function setToastInstance(instance: typeof toastInstance) {
  toastInstance = instance;
}

export const toast = {
  success: (message: string) => {
    if (toastInstance) {
      toastInstance.showSuccess(message);
    } else {
      // Fallback para alert se toast não estiver disponível
      alert(message);
    }
  },
  error: (message: string) => {
    if (toastInstance) {
      toastInstance.showError(message);
    } else {
      alert(message);
    }
  },
  warning: (message: string) => {
    if (toastInstance) {
      toastInstance.showWarning(message);
    } else {
      alert(message);
    }
  },
  info: (message: string) => {
    if (toastInstance) {
      toastInstance.showInfo(message);
    } else {
      alert(message);
    }
  },
};

// Sistema de alertas customizado do Vion Up!
// Substitui todos os alert() nativos por notificações toast

import { toast } from './toast';

// Função global para substituir window.alert
export function showAlert(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
    default:
      toast.info(message);
  }
}

// Funções específicas para facilitar o uso
export const alert = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
  // Mantém compatibilidade com alert() nativo, mas usa toast
  default: (message: string) => toast.info(message),
};

// Substitui window.alert globalmente (se necessário)
if (typeof window !== 'undefined') {
  // Salva o alert original
  (window as any).__originalAlert = window.alert;
  
  // Substitui por nossa versão
  window.alert = (message: string) => {
    toast.info(message);
  };
}

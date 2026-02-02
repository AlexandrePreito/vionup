'use client';

import { useEffect } from 'react';

/**
 * Componente cliente para inicializar o interceptor de API
 * Isso garante que o interceptor seja executado apenas no cliente
 */
export function APIInterceptor() {
  useEffect(() => {
    // Forçar inicialização do interceptor no cliente
    if (typeof window !== 'undefined') {
      import('@/lib/api-interceptor').then(() => {
        console.log('APIInterceptor - Módulo do interceptor carregado');
      });
    }
  }, []);

  return null;
}

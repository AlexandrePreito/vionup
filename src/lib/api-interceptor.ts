/**
 * Interceptor para adicionar user_id automaticamente em todas as requisições fetch
 * Isso garante que as APIs possam identificar o usuário logado
 */

// Armazenar referência ao fetch original
let originalFetch: typeof fetch;
let interceptorInitialized = false;

// Função para inicializar o interceptor
function initializeInterceptor() {
  if (typeof window === 'undefined' || interceptorInitialized) {
    return;
  }

  originalFetch = window.fetch;
  interceptorInitialized = true;
  console.log('Interceptor - Inicializando interceptor de API...');
  
  (window as any).fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Obter user_id do localStorage
    let userId: string | null = null;
    try {
      const storedUser = localStorage.getItem('meta10_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userId = user.id;
        console.log('Interceptor - User ID encontrado:', userId, 'Role:', user.role);
      } else {
        console.warn('Interceptor - Nenhum usuário no localStorage (chave: meta10_user)');
      }
    } catch (error) {
      console.error('Interceptor - Erro ao obter usuário do localStorage:', error);
    }

    // Preparar headers
    const headers = new Headers(init?.headers);

    // Adicionar user_id ao header se disponível
    if (userId) {
      headers.set('x-user-id', userId);
      console.log('Interceptor - Header x-user-id adicionado:', userId);
    } else {
      console.warn('Interceptor - Nenhum userId disponível para adicionar ao header');
    }

    // Criar novo init com headers atualizados
    const newInit: RequestInit = {
      ...init,
      headers: headers
    };

    // Log da URL sendo chamada (apenas para APIs que precisam de autenticação)
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'Request';
    if (url.includes('/api/') && (url.includes('/users') || url.includes('/groups') || url.includes('/companies'))) {
      console.log('Interceptor - Chamando', url, 'com headers:', Array.from(headers.entries()).filter(([key]) => key.toLowerCase().includes('user')));
    }

    // Chamar fetch original
    return originalFetch(input, newInit);
  };
  
  console.log('Interceptor de API carregado e ativo');
}

// Inicializar o interceptor quando o módulo for carregado (apenas no cliente)
if (typeof window !== 'undefined') {
  // Aguardar um pouco para garantir que o DOM está pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeInterceptor);
  } else {
    initializeInterceptor();
  }
}

// Exportar função para tornar o arquivo um módulo válido
export function initializeApiInterceptor() {
  initializeInterceptor();
}
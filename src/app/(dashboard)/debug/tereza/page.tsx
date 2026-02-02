'use client';

import { useState, useEffect } from 'react';
import { Loader2, User, Users, Layout, Monitor } from 'lucide-react';
import { Button } from '@/components/ui';

interface DiagnosticResult {
  user?: {
    id: string;
    email: string;
    name?: string;
    company_group_id?: string;
  };
  memberships?: Array<{
    id: string;
    user_id: string;
    company_group_id: string;
    company_group?: {
      id: string;
      name: string;
    };
  }>;
  screenOrders?: Array<{
    id: string;
    user_id: string;
    screen_id: string;
    display_order: number;
    screen?: {
      id: string;
      title: string;
    };
  }>;
  screen?: {
    id: string;
    title?: string;
    company_group_id?: string;
    [key: string]: any;
  };
  membershipError?: any;
  screenOrderError?: any;
  screenError?: any;
}

export default function TerezaDebugPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/debug/tereza');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao executar diagnóstico');
      }

      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Diagnóstico - Usuária Tereza
        </h1>
        <p className="text-gray-600">
          Informações sobre a usuária tereza@bpyou.com.br
        </p>
      </div>

      <div className="mb-4">
        <Button onClick={runDiagnostic} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando...
            </>
          ) : (
            'Atualizar Diagnóstico'
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Erro:</p>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {loading && !results && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* 1. Informações do Usuário */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                1. Informações do Usuário
              </h2>
            </div>
            {results.user ? (
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-700">ID:</span>
                  <span className="ml-2 text-gray-900 font-mono text-sm">
                    {results.user.id}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-900">{results.user.email}</span>
                </div>
                {results.user.name && (
                  <div>
                    <span className="font-medium text-gray-700">Nome:</span>
                    <span className="ml-2 text-gray-900">
                      {results.user.name}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Usuário não encontrado</p>
            )}
          </div>

          {/* 2. Membroships */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                2. Membroships (Grupos)
              </h2>
            </div>
            {results.membershipError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 text-sm">
                  Erro: {JSON.stringify(results.membershipError, null, 2)}
                </p>
              </div>
            ) : results.memberships && results.memberships.length > 0 ? (
              <div className="space-y-3">
                {results.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="p-3 bg-gray-50 rounded border border-gray-200"
                  >
                    <div>
                      <span className="font-medium text-gray-700">
                        Grupo ID:
                      </span>
                      <span className="ml-2 text-gray-900 font-mono text-sm">
                        {membership.company_group_id}
                      </span>
                    </div>
                    {membership.company_group && (
                      <div className="mt-1">
                        <span className="font-medium text-gray-700">
                          Nome do Grupo:
                        </span>
                        <span className="ml-2 text-gray-900">
                          {membership.company_group.name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhum membership encontrado</p>
            )}
          </div>

          {/* 3. Ordem de Telas */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Layout className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                3. Ordem de Telas Salvas
              </h2>
            </div>
            {results.screenOrderError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 text-sm">
                  Erro: {JSON.stringify(results.screenOrderError, null, 2)}
                </p>
              </div>
            ) : results.screenOrders && results.screenOrders.length > 0 ? (
              <div className="space-y-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-gray-700 font-medium">
                        Ordem
                      </th>
                      <th className="text-left py-2 px-3 text-gray-700 font-medium">
                        Screen ID
                      </th>
                      <th className="text-left py-2 px-3 text-gray-700 font-medium">
                        Título
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.screenOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-2 px-3 text-gray-900">
                          {order.display_order}
                        </td>
                        <td className="py-2 px-3 text-gray-900 font-mono text-xs">
                          {order.screen_id}
                        </td>
                        <td className="py-2 px-3 text-gray-900">
                          {order.screen?.title || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma ordem de tela encontrada</p>
            )}
          </div>

          {/* 4. Tela "Joanas Parque" */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                4. Tela "Joanas Parque"
              </h2>
            </div>
            {results.screenError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 text-sm">
                  Erro: {JSON.stringify(results.screenError, null, 2)}
                </p>
              </div>
            ) : results.screen ? (
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-700">ID:</span>
                  <span className="ml-2 text-gray-900 font-mono text-sm">
                    {results.screen.id}
                  </span>
                </div>
                {results.screen.title && (
                  <div>
                    <span className="font-medium text-gray-700">Título:</span>
                    <span className="ml-2 text-gray-900">
                      {results.screen.title}
                    </span>
                  </div>
                )}
                {results.screen.company_group_id && (
                  <div>
                    <span className="font-medium text-gray-700">
                      Grupo ID:
                    </span>
                    <span className="ml-2 text-gray-900 font-mono text-sm">
                      {results.screen.company_group_id}
                    </span>
                  </div>
                )}
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Dados completos:
                  </p>
                  <pre className="text-xs text-gray-600 overflow-auto">
                    {JSON.stringify(results.screen, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Tela não encontrada</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

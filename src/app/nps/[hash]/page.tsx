'use client';

import { useState, useEffect, use } from 'react';
import { 
  Star, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  User, 
  MessageSquare, 
  Building2 
} from 'lucide-react';

interface Pergunta {
  id: string;
  texto: string;
  tipo_resposta: string;
  categoria: string;
}

interface OpcaoOrigem {
  id: string;
  texto: string;
  icone: string;
}

interface LinkData {
  id: string;
  hash_link: string;
  tipo: string;
  ativo: boolean;
  pesquisa: {
    id: string;
    nome: string;
    tipo: string;
    descricao: string;
    ativo: boolean;
    company_group_id: string;
    nps_pesquisa_perguntas: {
      id: string;
      ordem: number;
      obrigatoria: boolean;
      pergunta: Pergunta;
    }[];
  };
  company: { id: string; name: string } | null;
  employee: { id: string; name: string } | null;
}

const FREQUENCIA_OPTIONS = [
  { value: 'primeira_vez', label: 'Primeira vez', emoji: '🆕' },
  { value: 'segunda_vez', label: 'Segunda vez', emoji: '✌️' },
  { value: 'as_vezes', label: 'Às vezes', emoji: '🔄' },
  { value: 'sempre', label: 'Sempre :)', emoji: '❤️' }
];

export default function ResponderNPSPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = use(params);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [opcoesOrigem, setOpcoesOrigem] = useState<OpcaoOrigem[]>([]);
  
  // Form state
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [respostasPerguntas, setRespostasPerguntas] = useState<Record<string, number>>({});
  const [confirmacoesUso, setConfirmacoesUso] = useState<Record<string, boolean | null>>({});
  const [frequenciaVisita, setFrequenciaVisita] = useState<string | null>(null);
  const [comoConheceuId, setComoConheceuId] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');

  // Carregar dados do link
  useEffect(() => {
    const fetchLink = async () => {
      try {
        const res = await fetch(`/api/nps/links?hash=${hash}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Link inválido ou expirado';
          throw new Error(errorMessage);
        }
        const data = await res.json();
        
        if (!data.link) {
          throw new Error('Link não encontrado');
        }
        
        if (!data.link.ativo) {
          throw new Error('Este link foi desativado');
        }
        
        if (!data.link.pesquisa) {
          throw new Error('Pesquisa não encontrada');
        }
        
        if (!data.link.pesquisa.ativo) {
          throw new Error('Esta pesquisa foi desativada');
        }
        
        setLinkData(data.link);
        setOpcoesOrigem(data.opcoesOrigem || []);
      } catch (err: any) {
        console.error('Erro ao carregar link:', err);
        setError(err.message || 'Erro ao carregar o link');
      } finally {
        setLoading(false);
      }
    };
    fetchLink();
  }, [hash]);

  // Máscara telefone
  const formatTelefone = (value: string) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
  };

  // Obter perguntas ordenadas e filtrar as que devem ser exibidas
  const getPerguntasParaExibir = () => {
    const perguntas = linkData?.pesquisa.nps_pesquisa_perguntas?.sort((a, b) => a.ordem - b.ordem) || [];
    const perguntasParaExibir: Array<{ item: any; isConfirmacao: boolean }> = [];
    
    perguntas.forEach((item) => {
      const requerConfirmacao = (item.pergunta as any).requer_confirmacao_uso;
      const confirmacao = confirmacoesUso[item.pergunta.id];
      
      // Se requer confirmação, adicionar step de confirmação
      if (requerConfirmacao) {
        perguntasParaExibir.push({ item, isConfirmacao: true });
        
        // Se confirmou uso, adicionar step de avaliação
        if (confirmacao === true) {
          perguntasParaExibir.push({ item, isConfirmacao: false });
        }
        // Se respondeu "Não", não adicionar step de avaliação (pula)
      } else {
        // Se não requer confirmação, adicionar direto o step de avaliação
        perguntasParaExibir.push({ item, isConfirmacao: false });
      }
    });
    
    return perguntasParaExibir;
  };

  // Calcular total de steps
  const getTotalSteps = () => {
    let steps = 2; // Nome + NPS
    const perguntasParaExibir = getPerguntasParaExibir();
    steps += perguntasParaExibir.length; // Cada pergunta (confirmação ou avaliação) é um step
    const ehCliente = linkData?.pesquisa.tipo === 'cliente';
    if (ehCliente) steps += 1; // Step de frequência + como conheceu
    steps += 1; // Comentário (sempre)
    
    return steps;
  };

  // Mapear step atual para step real
  const getStepContent = () => {
    const perguntasParaExibir = getPerguntasParaExibir();
    const ehCliente = linkData?.pesquisa.tipo === 'cliente';
    
    // Step 1: Nome (sempre)
    if (step === 1) return 'nome';
    
    // Step 2: NPS (sempre)
    if (step === 2) return 'nps';
    
    // Steps 3 até 3+perguntas.length: Perguntas (uma por vez)
    const stepInicioPerguntas = 3;
    const stepFimPerguntas = stepInicioPerguntas + perguntasParaExibir.length - 1;
    
    if (step >= stepInicioPerguntas && step <= stepFimPerguntas) {
      return 'perguntas';
    }
    
    // Step após perguntas: Extras (se cliente)
    const stepExtras = stepFimPerguntas + 1;
    if (ehCliente && step === stepExtras) {
      return 'extras';
    }
    
    // Último step: Comentário
    return 'comentario';
  };

  // Obter a pergunta atual (para exibir uma por vez)
  const getPerguntaAtual = () => {
    const perguntasParaExibir = getPerguntasParaExibir();
    const stepInicioPerguntas = 3;
    const indexPergunta = step - stepInicioPerguntas;
    
    if (indexPergunta >= 0 && indexPergunta < perguntasParaExibir.length) {
      return perguntasParaExibir[indexPergunta];
    }
    
    return null;
  };

  // Validar step atual
  const canProceed = () => {
    const content = getStepContent();
    
    switch (content) {
      case 'nome':
        const telefoneLimpo = telefone.replace(/\D/g, '');
        return nome.trim().length >= 2 && telefoneLimpo.length >= 10;
      case 'nps':
        return npsScore !== null;
      case 'perguntas':
        const perguntaAtual = getPerguntaAtual();
        if (!perguntaAtual) return false;
        
        // Se é confirmação de uso, verificar se foi respondida
        if (perguntaAtual.isConfirmacao) {
          const confirmacao = confirmacoesUso[perguntaAtual.item.pergunta.id];
          return confirmacao !== null && confirmacao !== undefined;
        }
        
        // Se é avaliação, verificar se foi respondida (se obrigatória)
        if (perguntaAtual.item.obrigatoria) {
          return respostasPerguntas[perguntaAtual.item.pergunta.id] !== undefined;
        }
        
        // Se não é obrigatória, pode prosseguir
        return true;
      case 'extras':
        return frequenciaVisita !== null && comoConheceuId !== null;
      case 'comentario':
        return comentario.trim().length >= 5;
      default:
        return true;
    }
  };

  // Enviar resposta
  const handleSubmit = async () => {
    if (!linkData) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        link_hash: hash,
        nome_respondente: nome.trim(),
        telefone_respondente: telefone.replace(/\D/g, ''),
        nps_score: npsScore,
        frequencia_visita: frequenciaVisita,
        como_conheceu_id: comoConheceuId,
        comentario: comentario.trim(),
        respostas_perguntas: Object.entries(respostasPerguntas).map(([perguntaId, nota]) => ({
          pergunta_id: perguntaId,
          nota
        })),
        confirmacoes_uso: Object.entries(confirmacoesUso).map(([perguntaId, confirmou]) => ({
          pergunta_id: perguntaId,
          confirmou_uso: confirmou
        })),
        dispositivo: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        user_agent: navigator.userAgent
      };

      const res = await fetch('/api/nps/respostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao enviar resposta');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Navegação
  const nextStep = () => {
    const total = getTotalSteps();
    if (step < total) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Avançar automaticamente quando responder "Não" na confirmação de uso
  useEffect(() => {
    const perguntaAtual = getPerguntaAtual();
    if (perguntaAtual?.isConfirmacao) {
      const confirmacao = confirmacoesUso[perguntaAtual.item.pergunta.id];
      // Se respondeu "Não", avançar automaticamente após um pequeno delay
      if (confirmacao === false) {
        const timer = setTimeout(() => {
          const total = getTotalSteps();
          if (step < total) {
            setStep(step + 1);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmacoesUso]);

  // Componente de estrelas
  const StarRating = ({ 
    value, 
    onChange, 
    size = 48 
  }: { 
    value: number | null; 
    onChange: (v: number) => void;
    size?: number;
  }) => (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <Star
            size={size}
            className={`transition-colors ${
              value !== null && star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  // ========== LOADING ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando pesquisa...</p>
        </div>
      </div>
    );
  }

  // ========== ERRO ==========
  if (error && !linkData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // ========== SUCESSO ==========
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Obrigado, {nome}!</h1>
          <p className="text-gray-600 mb-4">Sua avaliação foi enviada com sucesso.</p>
          <p className="text-lg font-medium text-green-600">{linkData?.company?.name}</p>
        </div>
      </div>
    );
  }

  // ========== FORMULÁRIO ==========
  const totalSteps = getTotalSteps();
  const currentContent = getStepContent();

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-lg mx-auto">

        {/* Card */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
          
          {/* ===== STEP: NOME ===== */}
          {currentContent === 'nome' && (
            <div className="p-6 sm:p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                  Pesquisa de Experiência
                </h1>
                <p className="text-lg sm:text-xl font-semibold text-blue-600 mb-4">
                  Queremos saber sua opinião!
                </p>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-md mx-auto mb-6">
                  Compartilhe com a gente como foi sua interação conosco. Sua resposta nos ajuda a fortalecer nossa missão de criar momentos significativos e manter viva a tradição de acolher com excelência.
                </p>
                {linkData?.company && (
                  <div className="space-y-1 mb-6">
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {linkData.company.name}
                    </p>
                    {linkData?.employee && (
                      <p className="text-sm sm:text-base font-bold text-gray-700">
                        {linkData.employee.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-gray-900 mb-2">
                    NOME *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Digite seu nome"
                    className="w-full px-4 py-3.5 sm:py-4 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-base sm:text-lg bg-gray-50"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-gray-900 mb-2">
                    CELULAR *
                  </label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-3.5 sm:py-4 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-base sm:text-lg bg-gray-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP: NPS ===== */}
          {currentContent === 'nps' && (
            <div className="p-6 sm:p-8">
              {/* Nome da empresa e atendente dentro do card */}
              {linkData?.company && (
                <div className="text-center mb-4">
                  <p className="text-base sm:text-lg font-bold text-gray-900">
                    {linkData.company.name}
                  </p>
                  {linkData?.employee && (
                    <p className="text-sm sm:text-base font-bold text-gray-700 mt-1">
                      {linkData.employee.name}
                    </p>
                  )}
                </div>
              )}
              {/* Progress - Dentro do card */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm sm:text-base text-gray-600 font-medium">Pergunta {step} de {totalSteps}</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-600">{Math.round((step / totalSteps) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-center mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Como foi sua experiência?</h2>
                <p className="text-sm sm:text-base text-gray-600">De 1 a 5, o quanto você recomendaria?</p>
              </div>
              
              <div className="flex justify-center mb-6">
                <StarRating value={npsScore} onChange={setNpsScore} size={48} />
              </div>
              
              {npsScore !== null && (
                <div className="mt-6 text-center">
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                    npsScore >= 4 
                      ? 'bg-green-100 text-green-700' 
                      : npsScore === 3 
                        ? 'bg-yellow-100 text-yellow-700' 
                        : 'bg-red-100 text-red-700'
                  }`}>
                    {npsScore >= 4 ? '😊 Que bom que gostou!' : npsScore === 3 ? '😐 Podemos melhorar!' : '😔 Sentimos muito!'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP: PERGUNTAS ===== */}
          {currentContent === 'perguntas' && (() => {
            const perguntaAtual = getPerguntaAtual();
            if (!perguntaAtual) return null;
            
            const { item, isConfirmacao } = perguntaAtual;
            
            // Se é confirmação de uso
            if (isConfirmacao) {
              return (
                <div className="p-6 sm:p-8">
                  {/* Nome da empresa e atendente dentro do card */}
                  {linkData?.company && (
                    <div className="text-center mb-4">
                      <p className="text-base sm:text-lg font-bold text-gray-900">
                        {linkData.company.name}
                      </p>
                      {linkData?.employee && (
                        <p className="text-sm sm:text-base font-bold text-gray-700 mt-1">
                          {linkData.employee.name}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Progress - Dentro do card */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm sm:text-base text-gray-600 font-medium">Pergunta {step} de {totalSteps}</span>
                      <span className="text-sm sm:text-base font-semibold text-gray-600">{Math.round((step / totalSteps) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${(step / totalSteps) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-base sm:text-lg font-bold text-blue-600 mb-2">
                      {item.pergunta.categoria || 'Confirmação'}
                    </p>
                    <p className="text-base sm:text-lg text-gray-900 text-center">
                      {item.pergunta.texto_confirmacao_uso || 'Você utilizou este serviço/produto?'}
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center mb-4">
                    <button
                      type="button"
                      onClick={() => setConfirmacoesUso(prev => ({ ...prev, [item.pergunta.id]: true }))}
                      className={`flex-1 max-w-[180px] px-6 py-3 rounded-lg border-2 transition-all text-base sm:text-lg font-medium ${
                        confirmacoesUso[item.pergunta.id] === true
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmacoesUso(prev => ({ ...prev, [item.pergunta.id]: false }))}
                      className={`flex-1 max-w-[180px] px-6 py-3 rounded-lg border-2 transition-all text-base sm:text-lg font-medium ${
                        confirmacoesUso[item.pergunta.id] === false
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 text-center italic">
                    Se você não utilizou este serviço/produto, não precisa avaliar. A pergunta será pulada automaticamente.
                  </p>
                </div>
              );
            }
            
            // Se é avaliação
            return (
              <div className="p-6 sm:p-8">
                {/* Nome da empresa e atendente dentro do card */}
                {linkData?.company && (
                  <div className="text-center mb-4">
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {linkData.company.name}
                    </p>
                    {linkData?.employee && (
                      <p className="text-sm sm:text-base font-bold text-gray-700 mt-1">
                        {linkData.employee.name}
                      </p>
                    )}
                  </div>
                )}
                {/* Progress - Dentro do card */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm sm:text-base text-gray-600 font-medium">Pergunta {step} de {totalSteps}</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-600">{Math.round((step / totalSteps) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-base sm:text-lg font-bold text-blue-600 mb-2">
                    {item.pergunta.categoria || 'Avaliação'}
                  </p>
                  <p className="text-base sm:text-lg text-gray-900 text-center">
                    {item.pergunta.texto}
                    {item.obrigatoria && <span className="text-red-500 ml-1">*</span>}
                  </p>
                </div>
                <div className="flex justify-center mb-3">
                  <StarRating
                    value={respostasPerguntas[item.pergunta.id] || null}
                    onChange={(v) => setRespostasPerguntas(prev => ({ ...prev, [item.pergunta.id]: v }))}
                    size={40}
                  />
                </div>
                <p className="text-xs sm:text-sm text-gray-500 text-center italic">
                  Avalie sua experiência: 1 estrela para "não gostei" e 5 estrelas para "excelente".
                </p>
              </div>
            );
          })()}

          {/* ===== STEP: EXTRAS (Frequência + Como Conheceu) ===== */}
          {currentContent === 'extras' && (
            <div className="p-6 sm:p-8 space-y-8">
              {/* Nome da empresa e atendente dentro do card */}
              {linkData?.company && (
                <div className="text-center mb-4">
                  <p className="text-base sm:text-lg font-bold text-gray-900">
                    {linkData.company.name}
                  </p>
                  {linkData?.employee && (
                    <p className="text-sm sm:text-base font-bold text-gray-700 mt-1">
                      {linkData.employee.name}
                    </p>
                  )}
                </div>
              )}
              {/* Progress - Dentro do card */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm sm:text-base text-gray-600 font-medium">Pergunta {step} de {totalSteps}</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-600">{Math.round((step / totalSteps) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
              {/* Frequência de Visita */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 text-center mb-4">
                  Com que frequência você nos visita?
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {FREQUENCIA_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFrequenciaVisita(opt.value)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        frequenciaVisita === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">{opt.emoji}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Como Conheceu */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 text-center mb-4">
                  Como conheceu a gente?
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {opcoesOrigem.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setComoConheceuId(opt.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        comoConheceuId === opt.id
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">{opt.icone}</span>
                      <span className="text-sm font-medium">{opt.texto}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP: COMENTÁRIO ===== */}
          {currentContent === 'comentario' && (
            <div className="p-6 sm:p-8">
              {/* Nome da empresa e atendente dentro do card */}
              {linkData?.company && (
                <div className="text-center mb-4">
                  <p className="text-base sm:text-lg font-bold text-gray-900">
                    {linkData.company.name}
                  </p>
                  {linkData?.employee && (
                    <p className="text-sm sm:text-base font-bold text-gray-700 mt-1">
                      {linkData.employee.name}
                    </p>
                  )}
                </div>
              )}
              {/* Progress - Dentro do card */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm sm:text-base text-gray-600 font-medium">Pergunta {step} de {totalSteps}</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-600">{Math.round((step / totalSteps) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-600 mb-4">
                  Sua opinião é muito importante
                </h2>
                <p className="text-sm sm:text-base text-gray-900 leading-relaxed mb-6">
                  Gostaríamos muito de conhecer sua opinião. Quais pontos você acredita que podemos melhorar? Há algo que gostaria de destacar como elogio?
                </p>
              </div>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Compartilhe sua experiência com detalhes..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-base sm:text-lg bg-gray-50"
                autoFocus
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Use este espaço para escrever sua resposta com suas próprias palavras.
              </p>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="px-6 pb-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className={`flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-lg transition-all text-sm sm:text-base ${
                step === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200 bg-white border border-gray-300'
              }`}
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed() || submitting}
              className={`flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all ${
                canProceed() && !submitting
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : step === totalSteps ? (
                <>
                  <span>Finalizar</span>
                  <ChevronRight size={18} />
                </>
              ) : step === 1 ? (
                <>
                  <span>CONTINUAR</span>
                </>
              ) : (
                <>
                  <span>Próximo</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 mt-6 pb-4 space-y-1">
          <p>Suas respostas são confidenciais e nos ajudam a melhorar.</p>
          <p>
            Desenvolvido por{' '}
            <a 
              href="https://www.vion.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              vion.com.br
            </a>
          </p>
          <p>Consultoria Financeira e Análise de Dados</p>
        </div>
      </div>
    </div>
  );
}

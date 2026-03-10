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
  const [employeesList, setEmployeesList] = useState<{ id: string; name: string }[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Form state
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [respostasPerguntas, setRespostasPerguntas] = useState<Record<string, number>>({});
  const [respostasTextoPerguntas, setRespostasTextoPerguntas] = useState<Record<string, string>>({});
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
        setEmployeesList(data.employees || []);
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

  // Verificar se a pesquisa já tem pergunta de tipo texto (evita step "Comentário" duplicado)
  const hasPerguntaTexto = () => {
    const perguntasParaExibir = getPerguntasParaExibir();
    return perguntasParaExibir.some((p) => !p.isConfirmacao && p.item.pergunta.tipo_resposta === 'texto');
  };

  // Calcular total de steps (nome + perguntas + frequência/como conheceu + comentário só se não houver pergunta texto)
  const getTotalSteps = () => {
    let steps = 1; // Nome
    const ehClienteMisterioso = linkData?.pesquisa.tipo === 'cliente_misterioso';
    if (ehClienteMisterioso) steps += 1; // Escolher garçom
    const perguntasParaExibir = getPerguntasParaExibir();
    steps += perguntasParaExibir.length;
    const ehCliente = linkData?.pesquisa.tipo === 'cliente';
    if (ehCliente) steps += 2; // Frequência + Como conheceu
    if (!hasPerguntaTexto()) steps += 1; // Comentário
    return steps;
  };

  // Mapear step atual para step real (comentário só aparece se não houver pergunta de texto na pesquisa)
  const getStepContent = () => {
    const perguntasParaExibir = getPerguntasParaExibir();
    const ehCliente = linkData?.pesquisa.tipo === 'cliente';
    const ehClienteMisterioso = linkData?.pesquisa.tipo === 'cliente_misterioso';

    if (step === 1) return 'nome';

    let nextStep = 2;

    // Step de seleção de garçom (só para cliente misterioso)
    if (ehClienteMisterioso) {
      if (step === nextStep) return 'selecionar_garcom';
      nextStep++;
    }

    const stepInicioPerguntas = nextStep;
    const stepFimPerguntas = stepInicioPerguntas + perguntasParaExibir.length - 1;
    if (step >= stepInicioPerguntas && step <= stepFimPerguntas) {
      return 'perguntas';
    }

    nextStep = stepFimPerguntas + 1;

    if (ehCliente && step === nextStep) return 'frequencia';
    if (ehCliente) nextStep++;
    if (ehCliente && step === nextStep) return 'como_conheceu';
    if (ehCliente) nextStep++;

    return 'comentario';
  };

  // Obter a pergunta atual (para exibir uma por vez, na ordem da pesquisa)
  const getPerguntaAtual = () => {
    const perguntasParaExibir = getPerguntasParaExibir();
    const ehClienteMisterioso = linkData?.pesquisa.tipo === 'cliente_misterioso';
    const stepInicioPerguntas = ehClienteMisterioso ? 3 : 2;
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
      case 'nome': {
        const telefoneLimpo = telefone.replace(/\D/g, '');
        return nome.trim().length >= 2 && telefoneLimpo.length >= 10;
      }
      case 'selecionar_garcom':
        return selectedEmployeeId !== null;
      case 'perguntas': {
        const perguntaAtual = getPerguntaAtual();
        if (!perguntaAtual) return false;
        if (perguntaAtual.isConfirmacao) {
          const confirmacao = confirmacoesUso[perguntaAtual.item.pergunta.id];
          return confirmacao !== null && confirmacao !== undefined;
        }
        if (perguntaAtual.item.obrigatoria) {
          const p = perguntaAtual.item.pergunta;
          if (p.tipo_resposta === 'estrelas') {
            return respostasPerguntas[p.id] !== undefined;
          }
          if (p.tipo_resposta === 'texto') {
            return (respostasTextoPerguntas[p.id]?.trim()?.length ?? 0) >= 5;
          }
        }
        return true;
      }
      case 'frequencia':
        return frequenciaVisita !== null;
      case 'como_conheceu':
        return comoConheceuId !== null;
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

    const perguntasParaExibir = getPerguntasParaExibir();
    const perguntaNPS = perguntasParaExibir.find(
      (p) => !p.isConfirmacao && p.item.pergunta.tipo_resposta === 'estrelas' &&
        (p.item.pergunta.texto?.toLowerCase().includes('recomendaria') || p.item.pergunta.categoria?.toLowerCase().includes('nps'))
    ) || perguntasParaExibir.find((p) => !p.isConfirmacao && p.item.pergunta.tipo_resposta === 'estrelas');
    const npsScoreToSend = perguntaNPS ? (respostasPerguntas[perguntaNPS.item.pergunta.id] ?? null) : null;

    const respostasPerguntasPayload = new Map<string, { nota?: number; texto_resposta?: string }>();
    perguntasParaExibir.forEach(({ item, isConfirmacao }) => {
      if (isConfirmacao) return;
      const id = item.pergunta.id;
      const nota = respostasPerguntas[id];
      const texto = respostasTextoPerguntas[id]?.trim();
      if (item.pergunta.tipo_resposta === 'estrelas' && nota !== undefined) {
        respostasPerguntasPayload.set(id, { nota });
      } else if (item.pergunta.tipo_resposta === 'texto' && texto) {
        respostasPerguntasPayload.set(id, { texto_resposta: texto });
      }
    });

    const comentarioParaEnvio = hasPerguntaTexto()
      ? Object.values(respostasTextoPerguntas).filter((t) => t?.trim()).join('\n').trim() || comentario.trim()
      : comentario.trim();

    try {
      const payload = {
        link_hash: hash,
        employee_id_override: selectedEmployeeId || null,
        nome_respondente: nome.trim(),
        telefone_respondente: telefone.replace(/\D/g, ''),
        nps_score: npsScoreToSend,
        frequencia_visita: frequenciaVisita,
        como_conheceu_id: comoConheceuId,
        comentario: comentarioParaEnvio,
        respostas_perguntas: Array.from(respostasPerguntasPayload.entries()).map(([perguntaId, v]) => ({
          pergunta_id: perguntaId,
          ...(v.nota !== undefined && { nota: v.nota }),
          ...(v.texto_resposta !== undefined && { texto_resposta: v.texto_resposta })
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
      <div className="nps-survey-page min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
      <div className="nps-survey-page min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
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
    const perguntasParaResumo = getPerguntasParaExibir().filter((p) => !p.isConfirmacao);
    return (
      <div className="nps-survey-page min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Obrigado, {nome}!</h1>
            <p className="text-gray-600 mb-2">Sua resposta foi registrada com sucesso. Agradecemos pela sua participação!</p>
            {linkData?.company?.name && (
              <p className="text-lg font-medium text-green-600">{linkData.company.name}</p>
            )}
          </div>
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Resumo das suas respostas:</h2>
            <ul className="space-y-4 text-left">
              {perguntasParaResumo.map(({ item }, index) => {
                const p = item.pergunta;
                const nota = respostasPerguntas[p.id];
                const texto = respostasTextoPerguntas[p.id]?.trim();
                const confirmou = item.pergunta.requer_confirmacao_uso ? confirmacoesUso[p.id] : true;
                if (item.pergunta.requer_confirmacao_uso && confirmou === false) {
                  return (
                    <li key={p.id} className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">
                        {index + 1}. {p.categoria || 'Pergunta'}
                      </span>
                      <p className="text-sm text-gray-600">{p.texto}</p>
                      <p className="text-sm text-gray-500 italic">Não utilizou</p>
                    </li>
                  );
                }
                return (
                  <li key={p.id} className="flex flex-col gap-1">
                    <span className="font-medium text-gray-700">
                      {index + 1}. {p.categoria || 'Pergunta'}
                    </span>
                    <p className="text-sm text-gray-600">{p.texto}</p>
                    {p.tipo_resposta === 'estrelas' && nota !== undefined ? (
                      <p className="text-lg text-yellow-500" title={`${nota} de 5`}>
                        {'★'.repeat(nota)}{'☆'.repeat(5 - nota)}
                      </p>
                    ) : texto ? (
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                        {texto.length > 200 ? `${texto.slice(0, 200)}...` : texto}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ========== FORMULÁRIO ==========
  const totalSteps = getTotalSteps();
  const currentContent = getStepContent();

  return (
    <div className="nps-survey-page min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">

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
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {linkData.company.name}
                    </p>
                    {linkData?.employee && (
                      <p className="text-base sm:text-lg font-bold text-gray-700">
                        {linkData.employee.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-gray-500 mb-2">
                    NOME
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
                  <label className="block text-sm sm:text-base font-bold text-gray-500 mb-2">
                    CELULAR
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

          {/* ===== STEP: SELECIONAR GARÇOM (cliente misterioso) ===== */}
          {currentContent === 'selecionar_garcom' && (
            <div className="p-6 sm:p-8">
              {linkData?.company && (
                <div className="text-center mb-4">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {linkData.company.name}
                  </p>
                </div>
              )}
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Quem te atendeu?
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Selecione o garçom que realizou seu atendimento
                </p>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {employeesList.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                      selectedEmployeeId === emp.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-gray-500" />
                    </div>
                    <span className="text-base font-medium">{emp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== STEP: PERGUNTAS (ordem da pesquisa: primeira pergunta após nome = primeira da lista) ===== */}
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
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {linkData.company.name}
                    </p>
                    {linkData?.employee && (
                      <p className="text-base sm:text-lg font-bold text-gray-700 mt-1">
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
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
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
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {linkData.company.name}
                    </p>
                    {linkData?.employee && (
                      <p className="text-base sm:text-lg font-bold text-gray-700 mt-1">
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
                {/* Categoria */}
                {item.pergunta.categoria && (
                  <div className="text-center mb-4">
                    <p className="text-base sm:text-lg font-bold text-blue-600">
                      {item.pergunta.categoria}
                    </p>
                  </div>
                )}
                {/* Pergunta principal */}
                <div className="text-center mb-6">
                  {item.pergunta.tipo_resposta === 'estrelas' ? (
                    <>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                        {item.pergunta.texto}
                      </h2>
                      <p className="text-base sm:text-lg text-gray-600">
                        De 1 a 5, o quanto você recomendaria?
                      </p>
                    </>
                  ) : (
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {item.pergunta.texto}
                    </h2>
                  )}
                </div>
                {/* Resposta: estrelas ou texto conforme tipo_resposta */}
                {item.pergunta.tipo_resposta === 'estrelas' ? (
                  <>
                    <div className="flex justify-center mb-6">
                      <StarRating
                        value={respostasPerguntas[item.pergunta.id] || null}
                        onChange={(v) => setRespostasPerguntas(prev => ({ ...prev, [item.pergunta.id]: v }))}
                        size={40}
                      />
                    </div>
                    {respostasPerguntas[item.pergunta.id] !== undefined && (
                      <div className="text-center">
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                          respostasPerguntas[item.pergunta.id] >= 4 
                            ? 'bg-green-100 text-green-700' 
                            : respostasPerguntas[item.pergunta.id] === 3 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {respostasPerguntas[item.pergunta.id] >= 4 ? '😊 Que bom que gostou!' : respostasPerguntas[item.pergunta.id] === 3 ? '😐 Podemos melhorar!' : '😔 Sentimos muito!'}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-left">
                    <textarea
                      value={respostasTextoPerguntas[item.pergunta.id] ?? ''}
                      onChange={(e) => setRespostasTextoPerguntas(prev => ({ ...prev, [item.pergunta.id]: e.target.value }))}
                      placeholder="Compartilhe sua opinião..."
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-base bg-gray-50"
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* ===== STEP: FREQUÊNCIA ===== */}
          {currentContent === 'frequencia' && (
            <div className="p-6 sm:p-8">
              {/* Nome da empresa e atendente dentro do card */}
              {linkData?.company && (
                <div className="text-center mb-4">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {linkData.company.name}
                  </p>
                  {linkData?.employee && (
                    <p className="text-base sm:text-lg font-bold text-gray-700 mt-1">
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
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                  Com que frequência você nos visita?
                </h2>
              </div>
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
          )}

          {/* ===== STEP: COMO CONHECEU ===== */}
          {currentContent === 'como_conheceu' && (
            <div className="p-6 sm:p-8">
              {/* Nome da empresa e atendente dentro do card */}
              {linkData?.company && (
                <div className="text-center mb-4">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {linkData.company.name}
                  </p>
                  {linkData?.employee && (
                    <p className="text-base sm:text-lg font-bold text-gray-700 mt-1">
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
              {/* Como Conheceu */}
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                  Como conheceu a gente?
                </h2>
              </div>
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
          )}

          {/* ===== STEP: COMENTÁRIO ===== */}
          {currentContent === 'comentario' && (
            <div className="p-6 sm:p-8">
              {/* Nome da empresa e atendente dentro do card */}
              {linkData?.company && (
                <div className="text-center mb-4">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {linkData.company.name}
                  </p>
                  {linkData?.employee && (
                    <p className="text-base sm:text-lg font-bold text-gray-700 mt-1">
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                  Sua opinião é muito importante
                </h2>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
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
          <div className={`px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-4 ${
            step === 1 ? 'justify-center' : 'justify-between'
          }`}>
            {step > 1 && (
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
            )}

            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed() || submitting}
              className={`flex items-center justify-center gap-2 ${step === 1 ? 'w-full' : ''} px-4 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all uppercase ${
                canProceed() && !submitting
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-md'
                  : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white opacity-50 cursor-not-allowed'
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
                  <span>AVANÇAR</span>
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

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2, Clock, Building, Users, Package, ShoppingCart, Wallet, TrendingUp, FolderTree, Settings, Plus, Trash2, CheckCircle, AlertCircle, Calendar, Power, PowerOff, Boxes, Square, RefreshCw, X, ChevronLeft, Database, FileText, List, Upload } from 'lucide-react';
import { Button, Modal, Input, Select } from '@/components/ui';
import { PowerBIConnection, PowerBISyncConfig, PowerBISyncSchedule } from '@/types';
import { toast } from '@/lib/toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useGroupFilter } from '@/hooks/useGroupFilter';

// ============================================================
// TIPOS
// ============================================================

interface FieldConfig {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
  isDax?: boolean;
}

interface EntityConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  fields: FieldConfig[];
  supportsIncremental: boolean;
  dateFieldKey?: string;
}

interface QueueItem {
  id: string;
  connection_id: string;
  config_id: string;
  company_group_id: string;
  start_date: string;
  end_date: string;
  sync_type: 'full' | 'incremental' | 'initial';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_days: number;
  processed_days: number;
  processed_records: number;
  current_date: string | null;
  batch_size: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

interface DetailStats {
  config: PowerBISyncConfig;
  logs: Array<{
    id: string;
    status: 'success' | 'error' | 'running';
    created_at: string;
    records_synced: number | null;
    error_message: string | null;
  }>;
  companyStats: Array<{
    company_name: string;
    record_count: number;
    min_date: string | null;
    max_date: string | null;
  }>;
  endDate: string | null;
  totalRecords: number;
}

// ============================================================
// CONFIGURAÇÃO DE ENTIDADES (mantido igual ao original)
// ============================================================

const entityTypeConfig: Record<string, EntityConfig> = {
  companies: {
    label: 'Empresas',
    icon: <Building size={24} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: Codigo' },
      { key: 'name', label: 'Razão Social', required: false, placeholder: 'Ex: RazaoSocial' },
      { key: 'fantasy_name', label: 'Nome Fantasia', required: false, placeholder: 'Ex: Filial' },
      { key: 'cnpj', label: 'CNPJ', required: false, placeholder: 'Ex: CNPJ' },
      { key: 'status', label: 'Status', required: false, placeholder: 'Ex: Status' },
    ]
  },
  employees: {
    label: 'Funcionários',
    icon: <Users size={24} />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: Codigo' },
      { key: 'external_company_id', label: 'ID Empresa *', required: true, placeholder: 'Ex: CodigoEmpresa' },
      { key: 'name', label: 'Nome', required: false, placeholder: 'Ex: Nome' },
      { key: 'external_code', label: 'Matrícula', required: false, placeholder: 'Ex: Matricula' },
      { key: 'email', label: 'Email', required: false, placeholder: 'Ex: Email' },
      { key: 'department', label: 'Departamento', required: false, placeholder: 'Ex: Departamento' },
      { key: 'position', label: 'Cargo', required: false, placeholder: 'Ex: Cargo' },
      { key: 'status', label: 'Status', required: false, placeholder: 'Ex: Status' },
    ]
  },
  products: {
    label: 'Produtos',
    icon: <Package size={24} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: Codigo' },
      { key: 'external_company_id', label: 'ID Empresa', required: false, placeholder: 'Ex: CodigoEmpresa' },
      { key: 'name', label: 'Nome', required: false, placeholder: 'Ex: Descricao' },
      { key: 'type', label: 'Tipo', required: false, placeholder: 'Ex: Tipo' },
      { key: 'category', label: 'Categoria', required: false, placeholder: 'Ex: Categoria' },
      { key: 'product_group', label: 'Grupo', required: false, placeholder: 'Ex: Grupo' },
    ]
  },
  sales: {
    label: 'Vendas',
    icon: <ShoppingCart size={24} />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    supportsIncremental: true,
    dateFieldKey: 'sale_date',
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: IdVenda' },
      { key: 'venda_id', label: 'Venda id', required: false, placeholder: 'Ex: VendaId' },
      { key: 'external_product_id', label: 'ID Produto *', required: true, placeholder: 'Ex: CodigoProduto' },
      { key: 'external_employee_id', label: 'ID Funcionário', required: false, placeholder: 'Ex: CodigoVendedor' },
      { key: 'external_company_id', label: 'ID Empresa *', required: true, placeholder: 'Ex: CodigoEmpresa' },
      { key: 'sale_date', label: 'Data *', required: true, placeholder: 'Ex: DataVenda' },
      { key: 'sale_mode', label: 'Modo', required: false, placeholder: 'Ex: ModoVenda' },
      { key: 'period', label: 'Período', required: false, placeholder: 'Ex: Almoço, Jantar' },
      { key: 'quantity', label: 'Quantidade *', required: true, placeholder: 'Ex: [Quantidades] ou SUM(Qtd)', isDax: true },
      { key: 'total_value', label: 'Valor Total *', required: true, placeholder: 'Ex: [Vendas Valor] ou SUM(Valor)', isDax: true },
      { key: 'cost', label: 'Custo', required: false, placeholder: 'Ex: [CMV] ou SUM(Custo)', isDax: true },
    ]
  },
  cash_flow: {
    label: 'Caixa',
    icon: <Wallet size={24} />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    supportsIncremental: true,
    dateFieldKey: 'transaction_date',
    fields: [
      { key: 'external_id', label: 'ID/Código *', required: true, placeholder: 'Ex: IdMovimentacao' },
      { key: 'external_employee_id', label: 'ID Funcionário', required: false, placeholder: 'Ex: CodigoOperador' },
      { key: 'external_company_id', label: 'ID Empresa', required: false, placeholder: 'Ex: CodigoEmpresa' },
      { key: 'transaction_date', label: 'Data *', required: true, placeholder: 'Ex: DataMovimentacao' },
      { key: 'payment_method', label: 'Meio Pagamento', required: false, placeholder: 'Ex: MeioPagamento' },
      { key: 'transaction_type', label: 'Tipo', required: false, placeholder: 'Ex: Tipo' },
      { key: 'transaction_mode', label: 'Modo', required: false, placeholder: 'Ex: Modo' },
      { key: 'period', label: 'Período', required: false, placeholder: 'Ex: Almoço, Jantar' },
      { key: 'amount', label: 'Valor *', required: true, placeholder: 'Ex: [ValorCaixa] ou SUM(Valor)', isDax: true },
    ]
  },
  cash_flow_statement: {
    label: 'Fluxo de Caixa',
    icon: <TrendingUp size={24} />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    supportsIncremental: true,
    dateFieldKey: 'transaction_date',
    fields: [
      { key: 'category_id', label: 'ID Categoria *', required: true, placeholder: 'Ex: idCategoria' },
      { key: 'external_company_id', label: 'ID Empresa', required: false, placeholder: 'Ex: idEmpresa' },
      { key: 'transaction_date', label: 'Data *', required: true, placeholder: 'Ex: Data' },
      { key: 'amount', label: 'Valor *', required: true, placeholder: 'Ex: [Valor] ou SUM(Valor)', isDax: true },
    ]
  },
  categories: {
    label: 'Categorias',
    icon: <FolderTree size={24} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_id', label: 'ID Categoria *', required: true, placeholder: 'Ex: idCategoria' },
      { key: 'layer_01', label: 'Camada 01', required: false, placeholder: 'Ex: Camada01' },
      { key: 'layer_02', label: 'Camada 02', required: false, placeholder: 'Ex: Camada02' },
      { key: 'layer_03', label: 'Camada 03', required: false, placeholder: 'Ex: Camada03' },
      { key: 'layer_04', label: 'Camada 04', required: false, placeholder: 'Ex: Camada04' },
      { key: 'external_company_id', label: 'ID Filial', required: false, placeholder: 'Ex: idFilial' },
    ]
  },
  stock: {
    label: 'Estoque',
    icon: <Boxes size={24} />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    supportsIncremental: false,
    fields: [
      { key: 'external_product_id', label: 'ID Produto *', required: true, placeholder: 'Ex: idProduto' },
      { key: 'product_name', label: 'Nome Produto', required: false, placeholder: 'Ex: nomeProduto' },
      { key: 'product_group', label: 'Grupo', required: false, placeholder: 'Ex: grupo' },
      { key: 'external_company_id', label: 'ID Empresa', required: false, placeholder: 'Ex: idEmpresa' },
      { key: 'unit', label: 'Unidade', required: false, placeholder: 'Ex: und_estq' },
      { key: 'purchase_unit', label: 'UN Compra', required: false, placeholder: 'Ex: und_compra' },
      { key: 'conversion_factor', label: 'Conversão', required: false, placeholder: 'Ex: fator_conversao' },
      { key: 'min_quantity', label: 'Qtd Mínima', required: false, placeholder: 'Ex: qtd_min' },
      { key: 'max_quantity', label: 'Qtd Máxima', required: false, placeholder: 'Ex: qtd_max' },
      { key: 'quantity', label: 'Quantidade *', required: true, placeholder: 'Ex: Quantidade' },
      { key: 'last_cost', label: 'Custo Último', required: false, placeholder: 'Ex: custo_ultimo' },
      { key: 'average_cost', label: 'Custo Médio', required: false, placeholder: 'Ex: custo_medio' },
      { key: 'updated_at_external', label: 'Data Alteração', required: false, placeholder: 'Ex: dt_alt' }
    ]
  }
};

const daysOfWeek = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function PowerBISincronizacaoPage() {
  // Hook para grupo selecionado
  const { selectedGroupId, groups } = useGroupFilter();
  
  // --- Estado original (mantido) ---
  const [connections, setConnections] = useState<PowerBIConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [configs, setConfigs] = useState<Record<string, PowerBISyncConfig | null>>({
    companies: null, employees: null, products: null, sales: null,
    cash_flow: null, cash_flow_statement: null, categories: null, stock: null
  });
  const [schedules, setSchedules] = useState<Record<string, PowerBISyncSchedule[]>>({
    companies: [], employees: [], products: [], sales: [],
    cash_flow: [], cash_flow_statement: [], categories: [], stock: []
  });
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<{ id: string; name: string }[]>([]);

  // Modal de configuração
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingEntityType, setEditingEntityType] = useState<string>('');
  const [configForm, setConfigForm] = useState({
    dataset_id: '', table_name: '', field_mappings: {} as Record<string, string>,
    date_field: '', initial_date: '', incremental_days: 7, is_incremental: false,
    dax_query: '' // Query DAX manual
  });
  const [savingConfig, setSavingConfig] = useState(false);
  
  // Estado para teste de query DAX
  const [testingQuery, setTestingQuery] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    rows?: any[];
    columns?: string[];
    error?: string;
    query_sent?: string;
  } | null>(null);

  // Modal de agendamento
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleEntityType, setScheduleEntityType] = useState<string>('');
  const [scheduleForm, setScheduleForm] = useState({
    schedule_type: 'daily' as 'daily' | 'weekly', day_of_week: 1, time_of_day: '08:00'
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Painel lateral de detalhes
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const [detailStats, setDetailStats] = useState<DetailStats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // --- NOVO: Estado da fila de sincronização ---
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [activeQueueItem, setActiveQueueItem] = useState<QueueItem | null>(null);
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{
    day: string;
    dayRecords: number;
    processedDays: number;
    totalDays: number;
    processedRecords: number;
    progress: number;
  } | null>(null);
  const [isQueuePanelOpen, setIsQueuePanelOpen] = useState(false);
  const [showRecentOnly, setShowRecentOnly] = useState(true);
  const isProcessingRef = useRef(false);
  const abortRef = useRef(false);
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modal de confirmação para parar sincronização
  const [isConfirmStopModalOpen, setIsConfirmStopModalOpen] = useState(false);
  const [pendingSync, setPendingSync] = useState<{ entityType: string; forceFullSync: boolean } | null>(null);

  // Modal de importação via planilha
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importEntityType, setImportEntityType] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [importDeleteExisting, setImportDeleteExisting] = useState(false);
  const [importStartDate, setImportStartDate] = useState('');
  const [importEndDate, setImportEndDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importingEntity, setImportingEntity] = useState<string | null>(null);
  const importEntityRef = useRef<string | null>(null);
  
  // Modal de seleção de grupo para importação
  const [showImportModal, setShowImportModal] = useState(false);
  const [importGroupId, setImportGroupId] = useState<string>('');

  // ============================================================
  // FUNÇÕES DE FETCH (mantidas do original)
  // ============================================================

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/powerbi/connections');
      if (!res.ok) return;
      const data = await res.json();
      const activeConnections = (data.connections || []).filter((c: PowerBIConnection) => c.is_active);
      setConnections(activeConnections);
      if (activeConnections.length > 0 && !selectedConnection) {
        setSelectedConnection(activeConnections[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar conexões:', error);
    }
  };

  const fetchDatasets = async (connectionId: string) => {
    if (!connectionId) return;
    try {
      const res = await fetch(`/api/powerbi/connections/${connectionId}/test`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.datasets) setDatasets(data.datasets);
    } catch (error) {
      console.error('Erro ao buscar datasets:', error);
    }
  };

  const fetchConfigs = useCallback(async (connectionId: string) => {
    if (!connectionId) return;
    try {
      const res = await fetch(`/api/powerbi/sync-configs?connection_id=${connectionId}`);
      if (!res.ok) return;
      const data = await res.json();
      
      const configMap: Record<string, PowerBISyncConfig | null> = {
        companies: null, employees: null, products: null, sales: null,
        cash_flow: null, cash_flow_statement: null, categories: null, stock: null
      };
      (data.configs || []).forEach((config: PowerBISyncConfig) => {
        configMap[config.entity_type] = config;
      });
      setConfigs(configMap);

      for (const config of data.configs || []) {
        await fetchSchedules(config.id, config.entity_type);
      }
    } catch (error) {
      console.error('Erro ao buscar configs:', error);
    }
  }, []);

  const fetchSchedules = async (configId: string, entityType: string) => {
    try {
      const res = await fetch(`/api/powerbi/schedules?config_id=${configId}`);
      if (!res.ok) return;
      const data = await res.json();
      setSchedules(prev => ({ ...prev, [entityType]: data.schedules || [] }));
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  // ============================================================
  // NOVO: FUNÇÕES DA FILA DE SINCRONIZAÇÃO
  // ============================================================

  // Buscar itens da fila
  // Ref para configs para evitar recriação do fetchQueue
  const configsRef = useRef(configs);
  useEffect(() => {
    configsRef.current = configs;
  }, [configs]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/powerbi/sync-queue');
      if (!res.ok) return;
      const data = await res.json();
      const items: QueueItem[] = data.queue || [];
      setQueueItems(items);

      const active = items.find(q => q.status === 'processing') || items.find(q => q.status === 'pending') || null;
      setActiveQueueItem(active);

      // Descobrir qual entidade está sincronizando
      if (active) {
        const config = Object.entries(configsRef.current).find(([_, c]) => c?.id === active.config_id);
        if (config) {
          setSyncingEntity(config[0]);
        }
      } else if (!isProcessingRef.current) {
        setSyncingEntity(null);
        setSyncProgress(null);
      }
    } catch (error) {
      console.error('Erro ao buscar fila:', error);
    }
  }, []); // Removido configs das dependências



  // Parar processamento
  const stopProcessing = useCallback(async () => {
    abortRef.current = true;
    if (processTimeoutRef.current) {
      clearTimeout(processTimeoutRef.current);
      processTimeoutRef.current = null;
    }
    isProcessingRef.current = false;

    // Cancelar item na fila
    if (activeQueueItem?.id) {
      try {
        await fetch(`/api/powerbi/sync-queue?id=${activeQueueItem.id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Erro ao cancelar:', e);
      }
    }

    setSyncingEntity(null);
    setSyncProgress(null);
    setActiveQueueItem(null);
    await fetchQueue();
    toast.info('Sincronização interrompida');
  }, [activeQueueItem, fetchQueue]);

  // ============================================================
  // SINCRONIZAÇÃO COM FILA
  // ============================================================
  const handleSync = async (config: PowerBISyncConfig, forceFullSync: boolean = false) => {
    try {
      setSyncingEntity(config.entity_type);
      abortRef.current = false;

      const syncType = forceFullSync ? 'full' : (config.is_incremental ? 'incremental' : 'full');

      // 1. Adicionar à fila
      const response = await fetch('/api/powerbi/sync-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_id: config.id,
          sync_type: syncType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao adicionar à fila');
      }

      const data = await response.json();
      toast.success(`${entityTypeConfig[config.entity_type].label} adicionado à fila`);

      // 2. Iniciar processamento
      await startQueueProcessing(data.queue_item.id);

    } catch (error: any) {
      console.error('❌ Erro ao sincronizar:', error);
      toast.error(error.message || 'Erro ao iniciar sincronização');
      setSyncingEntity(null);
      setSyncProgress(null);
    }
  };

  // ============================================================
  // IMPORTAÇÃO VIA PLANILHA
  // ============================================================
  const openImportModal = (entityType: string) => {
    setImportEntityType(entityType);
    setImportFile(null);
    setImportResult(null);
    setImportDeleteExisting(false);
    setImportStartDate('');
    setImportEndDate('');
    setIsImportModalOpen(true);
  };

  const handleImport = async () => {
    if (!importFile || !importEntityType) return;

    const config = configs[importEntityType];
    if (!config) {
      toast.error('Configuração não encontrada. Configure a entidade primeiro.');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('entity_type', importEntityType);
      formData.append('company_group_id', selectedGroupId || '');
      formData.append('config_id', config.id);
      formData.append('delete_existing', String(importDeleteExisting));
      if (importStartDate) formData.append('start_date', importStartDate);
      if (importEndDate) formData.append('end_date', importEndDate);

      const res = await fetch('/api/powerbi/import-spreadsheet', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setImportResult({
          success: false,
          message: data.error || 'Erro ao importar',
          details: data,
        });
        toast.error(data.error || 'Erro ao importar planilha');
      } else {
        setImportResult({
          success: true,
          message: `✅ ${data.saved.toLocaleString('pt-BR')} registros importados com sucesso!`,
          details: data,
        });
        toast.success(`${data.saved.toLocaleString('pt-BR')} registros importados!`);
      }
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.message || 'Erro na importação',
      });
      toast.error('Erro ao importar planilha');
    } finally {
      setImporting(false);
    }
  };

  // Colunas esperadas por entidade (para exibir no modal)
  const IMPORT_COLUMNS: Record<string, { required: string[]; optional: string[]; description: string }> = {
    sales: {
      required: ['empresa', 'data', 'codigo_produto', 'quantidade', 'valor_total'],
      optional: ['id_venda', 'codigo_funcionario', 'modo_venda', 'custo', 'periodo'],
      description: 'Vendas por item',
    },
    cash_flow: {
      required: ['empresa', 'data', 'valor'],
      optional: ['codigo_funcionario', 'meio_pagamento', 'tipo', 'modo', 'periodo'],
      description: 'Movimentações de caixa',
    },
    cash_flow_statement: {
      required: ['data', 'categoria', 'valor'],
      optional: ['empresa'],
      description: 'Fluxo de caixa / DRE',
    },
  };

  // Contador de tentativas para evitar loops infinitos
  const processingAttemptsRef = useRef(0);
  const dayErrorsRef = useRef(0); // Contador de erros de dia
  const MAX_ATTEMPTS = 1000; // Limite máximo de tentativas

  const startQueueProcessing = async (queueId: string) => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;
    dayErrorsRef.current = 0; // Reset contador de erros

    const processLoop = async () => {
      // Verificar cancelamento
      if (abortRef.current) {
        isProcessingRef.current = false;
        setSyncingEntity(null);
        setSyncProgress(null);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

        const response = await fetch('/api/powerbi/sync-queue/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queue_id: queueId }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => `HTTP ${response.status}`);
          throw new Error(errorText);
        }

        const result = await response.json();
        consecutiveErrors = 0; // Reset no sucesso

        // Atualizar progresso em tempo real
        if (result.processed_days !== undefined || result.processed_records !== undefined) {
          setActiveQueueItem(prev => prev ? {
            ...prev,
            processed_days: result.processed_days ?? prev.processed_days,
            processed_records: result.processed_records ?? prev.processed_records,
            total_days: result.total_days ?? prev.total_days,
            current_date: result.day ?? prev.current_date,
            status: 'processing',
          } : prev);
        }

        // Atualizar progresso visual
        if (result.status === 'processing' || result.status === 'completed') {
          setSyncProgress({
            day: result.day || '',
            dayRecords: result.day_records || 0,
            processedDays: result.processed_days || 0,
            totalDays: result.total_days || 0,
            processedRecords: result.processed_records || 0,
            progress: result.progress || 0,
          });
        }

        // Log progresso
        if (result.day) {
          console.log(`📊 ${result.day} — ${result.day_records || 0} registros (${result.progress || 0}%)`);
        }

        // Completou
        if (result.status === 'completed') {
          if (dayErrorsRef.current > 0) {
            toast.warning(
              `Sincronização concluída com ${dayErrorsRef.current} dia(s) com erro. ` +
              `${(result.processed_records || 0).toLocaleString('pt-BR')} registros processados.`
            );
          } else {
            toast.success(`Sincronização concluída! ${(result.processed_records || 0).toLocaleString('pt-BR')} registros`);
          }
          isProcessingRef.current = false;
          setSyncingEntity(null);
          setSyncProgress(null);
          dayErrorsRef.current = 0;
          await fetchQueue();
          await fetchConfigs(selectedConnection);
          return;
        }

        // Fila vazia
        if (result.status === 'empty') {
          if (dayErrorsRef.current > 0) {
            toast.warning(`Processamento interrompido com ${dayErrorsRef.current} dia(s) com erro.`);
          }
          isProcessingRef.current = false;
          setSyncingEntity(null);
          setSyncProgress(null);
          dayErrorsRef.current = 0;
          return;
        }

        // Erro num dia específico — NÃO parar, apenas logar
        if (result.status === 'day_error') {
          dayErrorsRef.current++;
          console.warn(`⚠️ Erro no dia ${result.day}: ${result.error}`);
          // NÃO mostrar toast para cada dia com erro (poluiria a tela)
          // O erro fica no log do queue item
        }

        // Continuar para o próximo dia
        if (result.has_more && !abortRef.current) {
          processTimeoutRef.current = setTimeout(processLoop, 1500);
        } else {
          isProcessingRef.current = false;
          setSyncingEntity(null);
          setSyncProgress(null);
          await fetchQueue();
          await fetchConfigs(selectedConnection);
        }

      } catch (error: any) {
        consecutiveErrors++;
        console.error(`❌ Erro (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error.message);

        // Erros de rede/timeout — tentar novamente com backoff
        const isRecoverable = error.name === 'AbortError' || 
          error.message?.includes('fetch') ||
          error.message?.includes('network') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('timeout');

        if (isRecoverable && consecutiveErrors < MAX_CONSECUTIVE_ERRORS && !abortRef.current) {
          const delay = Math.min(5000 * consecutiveErrors, 30000);
          console.log(`🔄 Retry em ${delay}ms...`);
          processTimeoutRef.current = setTimeout(processLoop, delay);
          return;
        }

        // Erro não recuperável ou muitos erros consecutivos
        // Informar progresso parcial no erro
        const lastProgress = activeQueueItem;
        if (lastProgress && lastProgress.processed_days > 0) {
          toast.info(
            `Progresso parcial: ${lastProgress.processed_days}/${lastProgress.total_days} dias, ` +
            `${(lastProgress.processed_records || 0).toLocaleString('pt-BR')} registros salvos`
          );
        }

        toast.error(consecutiveErrors >= MAX_CONSECUTIVE_ERRORS
          ? 'Muitos erros consecutivos. Sincronização interrompida.'
          : `Erro: ${error.message?.substring(0, 100) || 'Erro desconhecido'}`
        );
        isProcessingRef.current = false;
        setSyncingEntity(null);
        setSyncProgress(null);
        await fetchQueue();
      }
    };

    await processLoop();
  };

  const handleCancelSync = async (queueId: string) => {
    try {
      abortRef.current = true;

      if (processTimeoutRef.current) {
        clearTimeout(processTimeoutRef.current);
        processTimeoutRef.current = null;
      }

      const response = await fetch(`/api/powerbi/sync-queue?id=${queueId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao cancelar');

      toast.success('Sincronização cancelada');
      isProcessingRef.current = false;
      setSyncingEntity(null);
      setSyncProgress(null);
      await fetchQueue();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar');
    }
  };

  const handleConfirmStopAndSync = async () => {
    setIsConfirmStopModalOpen(false);
    
    await stopProcessing();
    // Aguardar a fila limpar antes de iniciar nova sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (pendingSync) {
      const config = configs[pendingSync.entityType];
      if (config) {
        await handleSync(config, pendingSync.forceFullSync);
      } else {
        toast.error('Configuração não encontrada para a entidade selecionada');
      }
      setPendingSync(null);
    }
  };

  const handleCancelStopSync = () => {
    setIsConfirmStopModalOpen(false);
    setPendingSync(null);
  };

  // ============================================================
  // IMPORTAR VIA PLANILHA
  // ============================================================
  const handleImportClick = (entityType: string) => {
    importEntityRef.current = entityType;
    // Pré-selecionar o grupo atual do filtro
    setImportGroupId(selectedGroupId || '');
    setShowImportModal(true);
  };

  const handleConfirmImportGroup = () => {
    if (!importGroupId) {
      toast.error('Selecione um grupo para importar');
      return;
    }
    setShowImportModal(false);
    // Abrir seletor de arquivo após confirmar o grupo
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const entityType = importEntityRef.current;
    if (!file || !entityType) return;
    e.target.value = '';

    const ext = file.name.toLowerCase().split('.').pop();
    if (!['xlsx', 'xls', 'csv', 'txt'].includes(ext || '')) {
      toast.error('Formato não suportado. Use .xlsx, .xls, .csv ou .txt');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Arquivo muito grande (max 50MB)');
      return;
    }

    const config = configs[entityType];
    if (!config) { toast.error('Entidade não configurada'); return; }

    // Usar o grupo selecionado no modal, não o do config
    if (!importGroupId) {
      toast.error('Grupo não selecionado');
      return;
    }

    setImportingEntity(entityType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);
      formData.append('company_group_id', importGroupId);
      formData.append('config_id', config.id);

      toast.info(`Importando ${file.name}...`);

      const res = await fetch('/api/powerbi/import-spreadsheet', { method: 'POST', body: formData });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || 'Erro na importação');
        console.error('Detalhes:', result);
        return;
      }

      if (result.failed > 0) {
        toast.warning(`Parcial: ${result.saved.toLocaleString('pt-BR')} salvos, ${result.failed} falharam`);
      } else {
        toast.success(`${result.saved.toLocaleString('pt-BR')} registros importados!`);
      }

      await fetchConfigs(selectedConnection);
      if (selectedEntityType === entityType) await fetchEntityDetails(entityType);
      
      // Resetar grupo após importação
      setImportGroupId('');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      // Resetar grupo em caso de erro também
      setImportGroupId('');
    } finally {
      setImportingEntity(null);
    }
  };

  // ============================================================
  // FUNÇÕES AUXILIARES (mantidas do original)
  // ============================================================

  const fetchEntityDetails = async (entityType: string) => {
    const config = configs[entityType];
    if (!config) return;

    setLoadingDetails(true);
    try {
      const logsRes = await fetch(`/api/powerbi/sync?config_id=${config.id}&limit=10`);
      
      let logsData: any = { logs: [] };
      if (logsRes.ok) {
        const contentType = logsRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const text = await logsRes.text();
          if (text && text.trim()) {
            try {
              logsData = JSON.parse(text);
            } catch (parseError) {
              console.error('Erro ao fazer parse do JSON:', parseError);
              console.error('Resposta recebida:', text);
            }
          }
        }
      } else {
        console.error('Erro na resposta da API:', logsRes.status, logsRes.statusText);
      }
      
      let companyStats: any[] = [];
      if (['sales', 'cash_flow', 'cash_flow_statement'].includes(entityType)) {
        try {
          const statsRes = await fetch(`/api/powerbi/sync-stats?config_id=${config.id}`);
          if (statsRes.ok) {
            const contentType = statsRes.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const text = await statsRes.text();
              if (text && text.trim()) {
                try {
                  const statsData = JSON.parse(text);
                  companyStats = statsData.stats || [];
                } catch (parseError) {
                  console.error('Erro ao fazer parse das estatísticas:', parseError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Erro ao buscar estatísticas por empresa:', error);
        }
      }

      let endDate: string | null = null;
      if (config.initial_date && config.date_field) {
        endDate = new Date().toISOString().split('T')[0];
      }

      setDetailStats({
        config,
        logs: logsData.logs || [],
        companyStats,
        endDate,
        totalRecords: config.last_sync_count || 0
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      // Definir valores padrão em caso de erro
      setDetailStats({
        config: configs[entityType]!,
        logs: [],
        companyStats: [],
        endDate: null,
        totalRecords: 0
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const openDetailPanel = (entityType: string) => {
    setSelectedEntityType(entityType);
    setIsDetailPanelOpen(true);
    fetchEntityDetails(entityType);
  };

  const closeDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedEntityType(null);
    setDetailStats(null);
  };

  const generateDaxQuery = (tableName: string, fieldMappings: Record<string, string>, entityType: string) => {
    const config = entityTypeConfig[entityType];
    const daxFields = config.fields.filter(f => f.isDax).map(f => f.key);
    const hasDaxFields = daxFields.some(key => fieldMappings[key]?.trim());
    
    const normalFieldEntries = Object.entries(fieldMappings)
      .filter(([key, pbiField]) => pbiField.trim() !== '' && !daxFields.includes(key));
    
    const normalFields = normalFieldEntries
      .map(([_, pbiField]) => `"${pbiField}", ${tableName}[${pbiField}]`)
      .join(',\n    ');

    const daxFieldEntries = Object.entries(fieldMappings)
      .filter(([key, pbiField]) => pbiField.trim() !== '' && daxFields.includes(key));

    const daxFieldsStr = daxFieldEntries
      .map(([dbField, pbiField]) => {
        const trimmedField = pbiField.trim();
        if (trimmedField.startsWith('[') && trimmedField.endsWith(']')) return `"${dbField}", ${trimmedField}`;
        if (trimmedField.includes('[') && trimmedField.includes(']')) {
          const bracketMatch = trimmedField.match(/\[([^\]]+)\]/);
          if (bracketMatch) return `"${dbField}", [${bracketMatch[1]}]`;
          return `"${dbField}", ${trimmedField}`;
        }
        if (trimmedField.includes('(')) return `"${dbField}", ${trimmedField}`;
        return `"${dbField}", SUM(${tableName}[${trimmedField}])`;
      })
      .join(',\n    ');

    if (!normalFields && !daxFieldsStr) return '';

    if (hasDaxFields && ['sales', 'cash_flow', 'cash_flow_statement'].includes(entityType)) {
      const groupByFields = normalFieldEntries.map(([_, pbiField]) => `${tableName}[${pbiField}]`).join(',\n    ');
      const firstRequiredDaxField = daxFieldEntries.find(([key]) => config.fields.find(f => f.key === key)?.required);
      const filterField = firstRequiredDaxField ? firstRequiredDaxField[0] : daxFieldEntries[0]?.[0] || 'amount';

      return `EVALUATE\nFILTER(\n  SUMMARIZECOLUMNS(\n    ${groupByFields},\n    ${daxFieldsStr}\n  ),\n  NOT ISBLANK([${filterField}])\n)`;
    }

    const allFields = [normalFields, daxFieldsStr].filter(Boolean).join(',\n    ');
    return `EVALUATE\nSELECTCOLUMNS(\n    ${tableName},\n    ${allFields}\n)`;
  };

  const generateFieldMapping = (fieldMappings: Record<string, string>, entityType: string) => {
    const mapping: Record<string, string> = {};
    Object.entries(fieldMappings)
      .filter(([_, pbiField]) => pbiField.trim() !== '')
      .forEach(([dbField, pbiField]) => {
        mapping[pbiField] = dbField;
      });
    return mapping;
  };

  const openConfigModal = (entityType: string) => {
    setEditingEntityType(entityType);
    const existingConfig = configs[entityType];
    const entityConfig = entityTypeConfig[entityType];
    
    if (existingConfig) {
      const invertedMapping: Record<string, string> = {};
      Object.entries(existingConfig.field_mapping).forEach(([pbiField, dbField]) => {
        invertedMapping[dbField as string] = pbiField;
      });
      const tableMatch = existingConfig.dax_query.match(/(?:SELECTCOLUMNS|SUMMARIZECOLUMNS)\(\s*(\w+)[\[,]/);
      
      setConfigForm({
        dataset_id: existingConfig.dataset_id,
        table_name: tableMatch ? tableMatch[1] : '',
        field_mappings: invertedMapping,
        date_field: existingConfig.date_field || '',
        initial_date: existingConfig.initial_date || '',
        incremental_days: existingConfig.incremental_days || 7,
        is_incremental: existingConfig.is_incremental || false,
        dax_query: existingConfig.dax_query || ''
      });
    } else {
      setConfigForm({
        dataset_id: '', table_name: '', field_mappings: {},
        date_field: '', initial_date: '', incremental_days: 7,
        is_incremental: entityConfig.supportsIncremental,
        dax_query: ''
      });
    }
    setIsConfigModalOpen(true);
    setTestResult(null); // Limpar resultado do teste ao abrir modal
  };

  const testDaxQuery = async () => {
    const query = configForm.dax_query?.trim()
      || generateDaxQuery(configForm.table_name, configForm.field_mappings, editingEntityType);

    if (!query) {
      toast.warning('Preencha a tabela e os campos primeiro');
      return;
    }

    if (!selectedConnection) {
      toast.warning('Selecione uma conexão primeiro');
      return;
    }

    setTestingQuery(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/powerbi/sync-queue/test-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: selectedConnection,
          dataset_id: configForm.dataset_id,
          dax_query: query,
        }),
      });

      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        toast.success(`Query OK! ${data.total_rows} registros retornados`);
      } else {
        toast.error('Erro na query DAX');
      }
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
      toast.error('Erro ao testar query');
    } finally {
      setTestingQuery(false);
    }
  };

  const saveConfig = async () => {
    const entityConfig = entityTypeConfig[editingEntityType];
    const requiredFields = entityConfig.fields.filter(f => f.required).map(f => f.key);
    const missingFields = requiredFields.filter(key => !configForm.field_mappings[key]?.trim());
    
    if (!configForm.dataset_id || !configForm.table_name || missingFields.length > 0) {
      const missingLabels = missingFields.map(key => entityConfig.fields.find(f => f.key === key)?.label || key);
      toast.warning(`Preencha: Dataset, Nome da Tabela e campos: ${missingLabels.join(', ')}`);
      return;
    }

    if (configForm.is_incremental && (!configForm.date_field || !configForm.initial_date)) {
      toast.warning('Para sincronização incremental, informe o campo de data e a data inicial');
      return;
    }

    setSavingConfig(true);
    try {
      const existingConfig = configs[editingEntityType];
      const url = existingConfig ? `/api/powerbi/sync-configs/${existingConfig.id}` : '/api/powerbi/sync-configs';
      const method = existingConfig ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: selectedConnection,
          entity_type: editingEntityType,
          dataset_id: configForm.dataset_id,
          dax_query: configForm.dax_query?.trim() || generateDaxQuery(configForm.table_name, configForm.field_mappings, editingEntityType),
          field_mapping: generateFieldMapping(configForm.field_mappings, editingEntityType),
          is_active: true,
          sync_interval_minutes: 60,
          date_field: configForm.is_incremental ? configForm.date_field : null,
          initial_date: configForm.is_incremental ? configForm.initial_date : null,
          incremental_days: configForm.incremental_days,
          is_incremental: configForm.is_incremental
        })
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar');
        return;
      }

      toast.success('Configuração salva com sucesso!');
      setIsConfigModalOpen(false);
      fetchConfigs(selectedConnection);
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSavingConfig(false);
    }
  };

  const openScheduleModal = (entityType: string) => {
    setScheduleEntityType(entityType);
    setScheduleForm({ schedule_type: 'daily', day_of_week: 1, time_of_day: '08:00' });
    setIsScheduleModalOpen(true);
  };

  const saveSchedule = async () => {
    const config = configs[scheduleEntityType];
    if (!config) return;

    setSavingSchedule(true);
    try {
      const res = await fetch('/api/powerbi/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_config_id: config.id,
          schedule_type: scheduleForm.schedule_type,
          day_of_week: scheduleForm.schedule_type === 'weekly' ? scheduleForm.day_of_week : null,
          time_of_day: scheduleForm.time_of_day
        })
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar');
        return;
      }

      toast.success('Agendamento salvo com sucesso!');
      setIsScheduleModalOpen(false);
      fetchSchedules(config.id, scheduleEntityType);
    } catch (error) {
      toast.error('Erro ao salvar agendamento');
    } finally {
      setSavingSchedule(false);
    }
  };

  const deleteSchedule = async (scheduleId: string, entityType: string) => {
    if (!confirm('Excluir este agendamento?')) return;
    try {
      await fetch(`/api/powerbi/schedules/${scheduleId}`, { method: 'DELETE' });
      const config = configs[entityType];
      if (config) fetchSchedules(config.id, entityType);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const toggleConfigActive = async (entityType: string) => {
    const config = configs[entityType];
    if (!config) return;
    try {
      const res = await fetch(`/api/powerbi/sync-configs/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !config.is_active })
      });
      if (res.ok) {
        toast.success(`Configuração ${!config.is_active ? 'ativada' : 'desativada'}!`);
        fetchConfigs(selectedConnection);
      }
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const deleteConfig = async (entityType: string) => {
    const config = configs[entityType];
    if (!config || !confirm(`Excluir configuração de ${entityTypeConfig[entityType]?.label}?`)) return;
    try {
      const res = await fetch(`/api/powerbi/sync-configs/${config.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Configuração excluída!');
        fetchConfigs(selectedConnection);
      }
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchConnections();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      fetchDatasets(selectedConnection);
      fetchConfigs(selectedConnection);
    }
  }, [selectedConnection]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (processTimeoutRef.current) clearTimeout(processTimeoutRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ============================================================
  // POLLING AUTOMÁTICO DA FILA (otimizado)
  // ============================================================
  useEffect(() => {
    if (!selectedConnection) return;

    fetchQueue();

    // Polling otimizado: intervalo maior para reduzir carga no servidor
    // 15 segundos quando não há processamento ativo (era 5 segundos)
    pollIntervalRef.current = setInterval(() => {
      if (!isProcessingRef.current && selectedConnection) {
        fetchQueue();
      }
    }, 15000); // 15 segundos - reduz carga quando não há processamento

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (processTimeoutRef.current) {
        clearTimeout(processTimeoutRef.current);
        processTimeoutRef.current = null;
      }
    };
  }, [selectedConnection]); // Removido fetchQueue das dependências

  // ============================================================
  // COMPUTED
  // ============================================================

  const connectionOptions = connections.map(c => ({ value: c.id, label: c.name }));
  const datasetOptions = datasets.map(d => ({ value: d.id, label: d.name }));
  const formatSchedule = (schedule: PowerBISyncSchedule) => {
    const time = schedule.time_of_day.slice(0, 5);
    if (schedule.schedule_type === 'daily') return `Diário às ${time}`;
    const day = daysOfWeek.find(d => d.value === schedule.day_of_week)?.label || '';
    return `${day} às ${time}`;
  };

  const currentEntityConfig = entityTypeConfig[editingEntityType];

  // Progresso do item ativo
  const activeProgress = activeQueueItem
    ? activeQueueItem.total_days > 0
      ? Math.round((activeQueueItem.processed_days / activeQueueItem.total_days) * 100)
      : 0
    : 0;

  const queuePendingCount = queueItems.filter(q => q.status === 'pending' || q.status === 'processing').length;

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sincronização Power BI</h1>
          <p className="text-gray-500 text-sm mt-1">Configure a importação de dados do Power BI</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão Fila */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQueuePanelOpen(true)}
            className="relative"
          >
            <List size={16} className="mr-2" />
            Fila
            {queuePendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {queuePendingCount}
              </span>
            )}
          </Button>
          <div className="w-64">
            <Select options={connectionOptions} value={selectedConnection} onChange={(e) => setSelectedConnection(e.target.value)} placeholder="Selecione a conexão" />
          </div>
        </div>
      </div>

      {/* NOVO: Barra de progresso global (aparece quando está processando) */}
      {syncingEntity && activeQueueItem && (
        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-900">
                Sincronizando {entityTypeConfig[syncingEntity]?.label || ''}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {activeQueueItem.sync_type === 'incremental' ? 'Incremental' : activeQueueItem.sync_type === 'full' ? 'Completa' : 'Inicial'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                Dia {activeQueueItem.processed_days}/{activeQueueItem.total_days}
                {activeQueueItem.current_date && ` — ${new Date(activeQueueItem.current_date + 'T00:00:00').toLocaleDateString('pt-BR')}`}
              </span>
              <span className="text-xs font-semibold text-gray-700">
                {(activeQueueItem.processed_records || 0).toLocaleString('pt-BR')} registros
              </span>
              <button
                onClick={stopProcessing}
                className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                title="Parar sincronização"
              >
                <Square size={14} />
              </button>
            </div>
          </div>
          {/* Progress bar — usar syncProgress se disponível, senão calcular do activeQueueItem */}
          {syncProgress ? (
            <div className="mt-2 space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  Dia {syncProgress.processedDays}/{syncProgress.totalDays}
                  {syncProgress.day && ` — ${syncProgress.day}`}
                </span>
                <span>
                  {syncProgress.processedRecords.toLocaleString('pt-BR')} registros ({syncProgress.progress}%)
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${activeProgress}%`,
                    background: activeProgress === 100
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">
                  {activeQueueItem.start_date && new Date(activeQueueItem.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  {' → '}
                  {activeQueueItem.end_date && new Date(activeQueueItem.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
                <span className="text-xs font-semibold text-blue-600">{activeProgress}%</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Legenda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Legenda dos botões:</h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><Play size={16} className="text-green-600" /></div>
            <span><strong>Verde:</strong> Incremental (últimos X dias, NÃO deleta histórico)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><RefreshCw size={16} className="text-blue-600" /></div>
            <span><strong>Azul:</strong> Completa (recarrega período, DELETA e reinsere)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><Upload size={16} className="text-purple-600" /></div>
            <span><strong>Roxo:</strong> Importar via Planilha (Excel/CSV)</span>
          </div>
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma conexão ativa</h3>
          <Button onClick={() => window.location.href = '/powerbi/conexoes'}>Ir para Conexões</Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Dataset</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Última Sync</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Agendamentos</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {Object.entries(entityTypeConfig).map(([entityType, config]) => {
                const syncConfig = configs[entityType];
                const entitySchedules = schedules[entityType] || [];
                const isConfigured = !!syncConfig;
                const isSyncing = syncingEntity === entityType;

                return (
                  <tr 
                    key={entityType} 
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${isConfigured ? '' : 'opacity-60'}`}
                    onClick={() => isConfigured && openDetailPanel(entityType)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="text-blue-600">{config.icon}</div>
                        <div>
                          <span className="font-medium">{config.label}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isSyncing ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Loader2 size={18} className="animate-spin" />
                          <span className="text-sm">Processando...</span>
                        </div>
                      ) : isConfigured ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle size={18} />
                          <span className="text-sm">Configurado</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Não configurado</span>
                      )}
                      {/* Progress bar — exibir quando sincronizando esta entidade */}
                      {isSyncing && syncProgress && (
                        <div className="mt-2 space-y-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${syncProgress.progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>
                              Dia {syncProgress.processedDays}/{syncProgress.totalDays}
                              {syncProgress.day && ` — ${syncProgress.day}`}
                            </span>
                            <span>
                              {syncProgress.processedRecords.toLocaleString('pt-BR')} registros ({syncProgress.progress}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {isConfigured ? datasets.find(d => d.id === syncConfig?.dataset_id)?.name || 'N/A' : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {syncConfig?.last_sync_at ? (
                        <div>
                          <div>{new Date(syncConfig.last_sync_at).toLocaleString('pt-BR')}</div>
                          {syncConfig.last_sync_count != null && (
                            <div className="text-xs text-gray-400">{syncConfig.last_sync_count.toLocaleString('pt-BR')} registros</div>
                          )}
                        </div>
                      ) : '-'}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                        {entitySchedules.length === 0 ? (
                          <span className="text-xs text-gray-400">Nenhum</span>
                        ) : entitySchedules.map(schedule => (
                          <div key={schedule.id} className="flex items-center justify-between text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            <div className="flex items-center gap-1"><Clock size={12} /><span>{formatSchedule(schedule)}</span></div>
                            <button onClick={() => deleteSchedule(schedule.id, entityType)} className="text-red-500 hover:text-red-600 ml-2"><Trash2 size={12} /></button>
                          </div>
                        ))}
                        {isConfigured && (
                          <button onClick={() => openScheduleModal(entityType)} className="text-blue-600 hover:text-blue-700 text-xs mt-1 flex items-center gap-1">
                            <Plus size={14} /><span>Adicionar</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        {isConfigured ? (
                          <>
                            {syncConfig?.is_incremental && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                <Calendar size={12} />{syncConfig.incremental_days}d
                              </span>
                            )}
                            
                            {isSyncing ? (
                              <button onClick={stopProcessing} className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg" title="Parar"><Square size={18} /></button>
                            ) : (
                              <button onClick={() => syncConfig && handleSync(syncConfig, false)} disabled={!syncConfig?.is_active} className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg disabled:opacity-50" title="Sync Incremental"><Play size={18} /></button>
                            )}

                            {syncConfig?.is_incremental && (
                              <button onClick={() => syncConfig && handleSync(syncConfig, true)} disabled={isSyncing || !syncConfig?.is_active} className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg disabled:opacity-50" title="Sync Completa"><RefreshCw size={18} /></button>
                            )}

                            {/* Importar Planilha — só para entidades de fato */}
                            {['sales', 'cash_flow', 'cash_flow_statement'].includes(entityType) && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImportClick(entityType);
                                }} 
                                disabled={importingEntity === entityType || isSyncing}
                                className="p-2 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-lg disabled:opacity-50" 
                                title="Importar Planilha"
                              >
                                {importingEntity === entityType ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                              </button>
                            )}

                            <button onClick={() => toggleConfigActive(entityType)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg" title={syncConfig?.is_active ? 'Desativar' : 'Ativar'}>
                              {syncConfig?.is_active ? <Power size={18} /> : <PowerOff size={18} />}
                            </button>
                            <button onClick={() => openConfigModal(entityType)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg" title="Configurar"><Settings size={18} /></button>
                            <button onClick={() => deleteConfig(entityType)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg" title="Excluir"><Trash2 size={18} /></button>
                          </>
                        ) : (
                          <Button onClick={() => openConfigModal(entityType)} size="sm"><Settings size={16} className="mr-2" />Configurar</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal de Configuração (mantido igual) */}
      <Modal isOpen={isConfigModalOpen} onClose={() => {
        setIsConfigModalOpen(false);
        setTestResult(null); // Limpar resultado do teste ao fechar modal
      }} title={`Configurar ${currentEntityConfig?.label || ''}`} size="xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Select label="Dataset *" options={datasetOptions} value={configForm.dataset_id} onChange={(e) => setConfigForm({ ...configForm, dataset_id: e.target.value })} placeholder="Selecione" />
          <Input label="Nome da Tabela no Power BI *" value={configForm.table_name} onChange={(e) => setConfigForm({ ...configForm, table_name: e.target.value })} placeholder="Ex: Vendas" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Query DAX (Opcional - deixe vazio para gerar automaticamente)</label>
            <textarea
              value={configForm.dax_query}
              onChange={(e) => setConfigForm({ ...configForm, dax_query: e.target.value })}
              placeholder="Ex: SUMMARIZECOLUMNS(...)"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono text-xs min-h-[120px]"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Se preenchido, esta query será usada em vez da query gerada automaticamente.
            </p>
          </div>

          {/* Preview da DAX gerada automaticamente */}
          {configForm.table_name && Object.values(configForm.field_mappings).some(v => v?.trim()) && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">
                    {configForm.dax_query?.trim()
                      ? 'Query DAX (manual)'
                      : 'Query DAX (auto-gerada)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const query = configForm.dax_query?.trim()
                      || generateDaxQuery(configForm.table_name, configForm.field_mappings, editingEntityType);
                    navigator.clipboard.writeText(query);
                    toast.success('Query copiada!');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Copiar
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-gray-700 bg-gray-900/5 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {configForm.dax_query?.trim()
                  || generateDaxQuery(configForm.table_name, configForm.field_mappings, editingEntityType)
                  || '// Preencha a tabela e campos para gerar a query'}
              </pre>
            </div>
          )}

          {/* Botão testar e resultado */}
          {configForm.table_name && (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={testDaxQuery}
                disabled={testingQuery || !configForm.dataset_id || !configForm.table_name || !selectedConnection}
                className="text-sm"
              >
                {testingQuery ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Play size={14} className="mr-2" />
                    Testar Query
                  </>
                )}
              </Button>
              {testResult && (
                <span className={`text-xs font-medium ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.success
                    ? `✓ ${testResult.rows?.length || 0} registros retornados`
                    : `✗ ${testResult.error}`}
                </span>
              )}
            </div>
          )}

          {/* Tabela de resultado do teste */}
          {testResult?.success && testResult.rows && testResult.rows.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-green-50 border-b border-green-200">
                <span className="text-xs font-medium text-green-700">
                  Preview dos dados ({testResult.rows.length} registros)
                </span>
              </div>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {testResult.columns?.map(col => (
                        <th key={col} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {testResult.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {testResult.columns?.map(col => (
                          <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                            {row[col] !== null && row[col] !== undefined
                              ? String(row[col])
                              : <span className="text-gray-300 italic">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Erro detalhado do teste */}
          {testResult && !testResult.success && testResult.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700 font-medium mb-1">Erro na Query:</p>
              <p className="text-xs text-red-600">{testResult.error}</p>
              {testResult.query_sent && (
                <details className="mt-2">
                  <summary className="text-xs text-red-500 cursor-pointer">Ver query enviada</summary>
                  <pre className="mt-1 text-xs font-mono text-red-600 whitespace-pre-wrap">
                    {testResult.query_sent}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mapeamento de Campos</label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {currentEntityConfig?.fields.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-1/3"><span className={`text-sm ${field.required ? 'font-medium' : 'text-gray-600'}`}>{field.label} {field.isDax && '📊'}</span></div>
                  <div className="w-2/3">
                    <input type="text" value={configForm.field_mappings[field.key] || ''} onChange={(e) => setConfigForm({ ...configForm, field_mappings: { ...configForm.field_mappings, [field.key]: e.target.value } })} placeholder={field.placeholder} className={`w-full px-3 py-2 text-sm border rounded-lg ${field.required && !configForm.field_mappings[field.key] ? 'border-red-300 bg-red-50' : 'border-gray-300'} ${field.isDax ? 'font-mono text-xs' : ''}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {currentEntityConfig?.supportsIncremental && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <input type="checkbox" id="is_incremental" checked={configForm.is_incremental} onChange={(e) => setConfigForm({ ...configForm, is_incremental: e.target.checked })} className="w-4 h-4 rounded" />
                <label htmlFor="is_incremental" className="text-sm font-medium">Sincronização Incremental</label>
              </div>
              {configForm.is_incremental && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                  <div className="text-xs text-blue-700">
                    <p><strong>🟢 Verde:</strong> Atualiza últimos X dias (NÃO deleta)</p>
                    <p><strong>🔵 Azul:</strong> Recarrega período (DELETA e reinsere)</p>
                  </div>
                  <Input label="Campo de Data *" value={configForm.date_field} onChange={(e) => setConfigForm({ ...configForm, date_field: e.target.value })} placeholder="Ex: DataVenda" />
                  <Input label="Data Inicial *" type="date" value={configForm.initial_date} onChange={(e) => setConfigForm({ ...configForm, initial_date: e.target.value })} />
                  <Input label="Dias Incremental" type="number" value={configForm.incremental_days} onChange={(e) => setConfigForm({ ...configForm, incremental_days: parseInt(e.target.value) || 7 })} min={1} max={365} />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsConfigModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveConfig} isLoading={savingConfig}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Agendamento (mantido igual) */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title={`Agendar ${entityTypeConfig[scheduleEntityType]?.label || ''}`}>
        <div className="space-y-4">
          <Select label="Frequência" options={[{ value: 'daily', label: 'Diário' }, { value: 'weekly', label: 'Semanal' }]} value={scheduleForm.schedule_type} onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_type: e.target.value as 'daily' | 'weekly' })} />
          {scheduleForm.schedule_type === 'weekly' && (
            <Select label="Dia da Semana" options={daysOfWeek.map(d => ({ value: String(d.value), label: d.label }))} value={String(scheduleForm.day_of_week)} onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })} />
          )}
          <Input label="Horário" type="time" value={scheduleForm.time_of_day} onChange={(e) => setScheduleForm({ ...scheduleForm, time_of_day: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsScheduleModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveSchedule} isLoading={savingSchedule}>Adicionar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação para Parar Sincronização */}
      <Modal isOpen={isConfirmStopModalOpen} onClose={handleCancelStopSync} title="Confirmar Interrupção">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle size={24} className="text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-700 mb-2">
                Há uma sincronização em andamento ({syncingEntity ? entityTypeConfig[syncingEntity]?.label : 'outra sincronização'}).
              </p>
              <p className="text-gray-700 font-medium">
                Deseja parar a sincronização atual e iniciar a nova ({pendingSync ? entityTypeConfig[pendingSync.entityType]?.label : ''})?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={handleCancelStopSync}>Cancelar</Button>
            <Button onClick={handleConfirmStopAndSync} className="bg-blue-600 hover:bg-blue-700 text-white">
              Parar e Iniciar Nova
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Importação via Planilha */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title={`Importar ${entityTypeConfig[importEntityType]?.label || ''} via Planilha`} size="xl">
        <div className="space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Instruções */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-amber-900 mb-2">📋 Formato da Planilha</h4>
            <p className="text-xs text-amber-700 mb-3">
              Exporte os dados do Power BI Desktop para Excel. A primeira linha deve conter os nomes das colunas.
            </p>
            
            {IMPORT_COLUMNS[importEntityType] && (
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-semibold text-amber-800">Colunas obrigatórias:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {IMPORT_COLUMNS[importEntityType].required.map(col => (
                      <span key={col} className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-mono">{col}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-amber-800">Colunas opcionais:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {IMPORT_COLUMNS[importEntityType].optional.map(col => (
                      <span key={col} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-mono">{col}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upload do arquivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo Excel ou CSV</label>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                importFile 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file) setImportFile(file);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImportFile(file);
                }}
              />
              {importFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle size={24} className="text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700">{importFile.name}</p>
                    <p className="text-xs text-green-600">{(importFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setImportFile(null); }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Clique ou arraste o arquivo aqui</p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx, .xls ou .csv</p>
                </div>
              )}
            </div>
          </div>

          {/* Opção de deletar existentes */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={importDeleteExisting}
                onChange={(e) => setImportDeleteExisting(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Substituir dados existentes no período</span>
                <p className="text-xs text-gray-500">Deleta registros do período antes de importar (evita duplicação)</p>
              </div>
            </label>

            {importDeleteExisting && (
              <div className="flex gap-3 ml-7">
                <Input
                  label="Data início"
                  type="date"
                  value={importStartDate}
                  onChange={(e) => setImportStartDate(e.target.value)}
                />
                <Input
                  label="Data fim"
                  type="date"
                  value={importEndDate}
                  onChange={(e) => setImportEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Resultado da importação */}
          {importResult && (
            <div className={`rounded-lg p-4 ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {importResult.message}
              </p>
              {importResult.details && (
                <div className="mt-2 text-xs space-y-1">
                  {importResult.details.total_rows != null && (
                    <p className="text-gray-600">Linhas lidas: {importResult.details.total_rows.toLocaleString('pt-BR')}</p>
                  )}
                  {importResult.details.valid_records != null && (
                    <p className="text-gray-600">Registros válidos: {importResult.details.valid_records.toLocaleString('pt-BR')}</p>
                  )}
                  {importResult.details.unique_records != null && (
                    <p className="text-gray-600">Registros únicos: {importResult.details.unique_records.toLocaleString('pt-BR')}</p>
                  )}
                  {importResult.details.saved != null && (
                    <p className="text-green-600 font-medium">Salvos: {importResult.details.saved.toLocaleString('pt-BR')}</p>
                  )}
                  {importResult.details.failed > 0 && (
                    <p className="text-red-600">Falharam: {importResult.details.failed.toLocaleString('pt-BR')}</p>
                  )}
                  {importResult.details.duplicates_removed > 0 && (
                    <p className="text-amber-600">Duplicatas removidas: {importResult.details.duplicates_removed}</p>
                  )}
                  {importResult.details.errors?.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-red-600 cursor-pointer">Ver erros ({importResult.details.errors.length})</summary>
                      <ul className="mt-1 space-y-0.5">
                        {importResult.details.errors.map((err: string, i: number) => (
                          <li key={i} className="text-red-500">{err}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {importResult.details.expected && (
                    <div className="mt-2 p-2 bg-white rounded border">
                      <p className="font-medium text-gray-700 mb-1">Colunas esperadas:</p>
                      <p className="text-gray-600">Obrigatórias: {importResult.details.expected.join(', ')}</p>
                      <p className="text-gray-600">Opcionais: {importResult.details.optional?.join(', ')}</p>
                      <p className="text-gray-600 mt-1">Encontradas: {importResult.details.found?.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
              {importResult?.success ? 'Fechar' : 'Cancelar'}
            </Button>
            {!importResult?.success && (
              <Button
                onClick={handleImport}
                disabled={!importFile || importing}
                isLoading={importing}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Upload size={16} className="mr-2" />
                Importar
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Seleção de Grupo para Importação */}
      <Modal 
        isOpen={showImportModal} 
        onClose={() => {
          setShowImportModal(false);
          setImportGroupId(''); // Resetar ao fechar
        }} 
        title="Importar Planilha"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecione o grupo onde deseja importar os dados:
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grupo
            </label>
            <Select
              options={groups.map(g => ({ value: g.id, label: g.name }))}
              value={importGroupId}
              onChange={(e) => setImportGroupId(e.target.value)}
              placeholder="Selecione um grupo"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowImportModal(false);
                setImportGroupId(''); // Resetar ao cancelar
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImportGroup}
              disabled={!importGroupId}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Importar
            </Button>
          </div>
        </div>
      </Modal>

      {/* NOVO: Painel lateral da fila */}
      {isQueuePanelOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsQueuePanelOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <List size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Fila de Sincronização</h2>
                    <p className="text-sm text-gray-500">
                      {showRecentOnly 
                        ? queueItems.filter(item => {
                            const createdAt = new Date(item.created_at);
                            const oneDayAgo = new Date();
                            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                            return createdAt > oneDayAgo;
                          }).length 
                        : queueItems.length
                      } itens
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsQueuePanelOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRecentOnly(!showRecentOnly)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    showRecentOnly
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Últimas 24h
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/powerbi/sync-queue?id=&action=cleanup', { method: 'DELETE' });
                      if (res.ok) {
                        toast.success('Itens antigos removidos');
                        fetchQueue();
                      }
                    } catch (err) {
                      toast.error('Erro ao limpar itens antigos');
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  title="Remover itens completed/failed/cancelled com mais de 30 dias"
                >
                  Limpar Antigos
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {(() => {
                const recentQueue = showRecentOnly 
                  ? queueItems.filter(item => {
                      const createdAt = new Date(item.created_at);
                      const oneDayAgo = new Date();
                      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                      return createdAt > oneDayAgo;
                    })
                  : queueItems;

                return recentQueue.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Database size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Fila vazia</p>
                    <p className="text-xs text-gray-400 mt-1">As sincronizações aparecerão aqui</p>
                  </div>
              ) : (
                recentQueue.map(item => {
                  const configEntry = Object.entries(configs).find(([_, c]) => c?.id === item.config_id);
                  const entityType = configEntry?.[0] || '';
                  const entityConf = entityTypeConfig[entityType];
                  const pct = item.total_days > 0 ? Math.round((item.processed_days / item.total_days) * 100) : 0;

                  const statusMap: Record<string, { text: string; color: string; bg: string }> = {
                    pending: { text: 'Aguardando', color: 'text-yellow-700', bg: 'bg-yellow-100' },
                    processing: { text: 'Processando', color: 'text-blue-700', bg: 'bg-blue-100' },
                    completed: { text: 'Concluído', color: 'text-green-700', bg: 'bg-green-100' },
                    failed: { text: 'Erro', color: 'text-red-700', bg: 'bg-red-100' },
                    cancelled: { text: 'Cancelado', color: 'text-gray-700', bg: 'bg-gray-100' },
                  };
                  const st = statusMap[item.status] || statusMap.pending;

                  return (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {entityConf && <span className={entityConf.color}>{entityConf.icon}</span>}
                          <span className="text-sm font-medium">{entityConf?.label || 'Desconhecido'}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color} font-medium`}>
                          {st.text}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Tipo: {item.sync_type === 'incremental' ? 'Incremental' : item.sync_type === 'full' ? 'Completa' : 'Inicial'}</span>
                          <span>{(item.processed_records || 0).toLocaleString('pt-BR')} registros</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{new Date(item.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(item.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          <span>Dia {item.processed_days}/{item.total_days}</span>
                        </div>
                      </div>

                      {(item.status === 'processing' || item.status === 'pending') && (
                        <div className="mt-2">
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-xs text-gray-400">
                              {item.current_date && new Date(item.current_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-xs font-semibold text-blue-600">{pct}%</span>
                          </div>
                        </div>
                      )}

                      {item.error_message && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          {item.error_message}
                        </div>
                      )}

                      {item.finished_at && (
                        <div className="mt-2 text-xs text-gray-400">
                          Finalizado: {new Date(item.finished_at).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  );
                })
              )
              })()}
            </div>
          </div>
        </>
      )}

      {/* Painel Lateral de Detalhes (mantido igual) */}
      {isDetailPanelOpen && selectedEntityType && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDetailPanel} />
          <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    {entityTypeConfig[selectedEntityType]?.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {entityTypeConfig[selectedEntityType]?.label}
                    </h2>
                    <p className="text-sm text-gray-500">Detalhes da Sincronização</p>
                  </div>
                </div>
                <button onClick={closeDetailPanel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Fechar">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                </div>
              ) : detailStats ? (
                <>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Informações Gerais</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Dataset</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {datasets.find(d => d.id === detailStats.config.dataset_id)?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Última Atualização</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {detailStats.config.last_sync_at 
                            ? new Date(detailStats.config.last_sync_at).toLocaleString('pt-BR')
                            : 'Nunca sincronizado'}
                        </p>
                      </div>
                      {detailStats.config.initial_date && (
                        <div>
                          <label className="text-xs font-medium text-gray-500">Data de Início</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {new Date(detailStats.config.initial_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                      {detailStats.endDate && (
                        <div>
                          <label className="text-xs font-medium text-gray-500">Data Final</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {new Date(detailStats.endDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-gray-500">Total de Registros</label>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {detailStats.totalRecords.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      {detailStats.config.is_incremental && (
                        <div>
                          <label className="text-xs font-medium text-gray-500">Tipo de Sincronização</label>
                          <p className="text-sm text-gray-900 mt-1">
                            Incremental ({detailStats.config.incremental_days} dias)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Ações</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const config = configs[selectedEntityType!];
                          if (config) {
                            closeDetailPanel();
                            handleSync(config, false);
                          }
                        }}
                        disabled={syncingEntity !== null}
                        className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg
                          hover:bg-green-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play size={14} />
                        Sync Incremental
                      </button>
                      <button
                        onClick={() => {
                          const config = configs[selectedEntityType!];
                          if (config) {
                            closeDetailPanel();
                            handleSync(config, true);
                          }
                        }}
                        disabled={syncingEntity !== null}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg
                          hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={14} />
                        Sync Completa
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm(`Tem certeza que deseja limpar TODOS os dados de ${entityTypeConfig[selectedEntityType!]?.label}? Esta ação não pode ser desfeita.`)) {
                          return;
                        }
                        try {
                          const config = configs[selectedEntityType!];
                          if (!config) return;
                          
                          const res = await fetch(`/api/powerbi/sync-configs/${config.id}/clear-data`, {
                            method: 'DELETE',
                          });
                          
                          if (res.ok) {
                            toast.success('Dados limpos com sucesso');
                            // Recarregar estatísticas
                            if (selectedEntityType) {
                              fetchEntityDetails(selectedEntityType);
                            }
                          } else {
                            const data = await res.json();
                            toast.error(data.error || 'Erro ao limpar dados');
                          }
                        } catch (error: any) {
                          toast.error('Erro ao limpar dados');
                        }
                      }}
                      disabled={!detailStats?.config || syncingEntity !== null}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg
                        hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                      Limpar Dados
                    </button>
                    {selectedEntityType && ['sales', 'cash_flow', 'cash_flow_statement'].includes(selectedEntityType) && (
                      <button
                        onClick={() => handleImportClick(selectedEntityType)}
                        disabled={importingEntity !== null || syncingEntity !== null}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                      >
                        {importingEntity === selectedEntityType ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        Importar Planilha
                      </button>
                    )}
                  </div>

                  {/* Query DAX salva */}
                  {detailStats.config.dax_query && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Query DAX</h3>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(detailStats.config.dax_query);
                            toast.success('Query copiada!');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Copiar
                        </button>
                      </div>
                      <pre className="bg-gray-900/5 rounded-lg p-3 text-xs font-mono text-gray-700
                        overflow-x-auto max-h-40 whitespace-pre-wrap border border-gray-200">
                        {detailStats.config.dax_query}
                      </pre>
                    </div>
                  )}

                  {/* Mapeamento de campos salvo */}
                  {detailStats.config.field_mapping && Object.keys(detailStats.config.field_mapping).length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Mapeamento</h3>
                      <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                        {Object.entries(detailStats.config.field_mapping).map(([pbiField, dbField]) => (
                          <div key={pbiField} className="flex items-center justify-between px-3 py-2">
                            <span className="text-xs font-mono text-gray-600">{pbiField}</span>
                            <span className="text-xs text-gray-400">→</span>
                            <span className="text-xs font-medium text-gray-900">{String(dbField)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tempo estimado baseado no histórico */}
                  {detailStats.logs && detailStats.logs.length > 0 && (() => {
                    const successfulLogs = detailStats.logs.filter((log: any) => 
                      log.status === 'success' && 
                      log.records_synced > 0 &&
                      log.started_at &&
                      log.finished_at
                    );
                    if (successfulLogs.length === 0) return null;
                    
                    // Calcular média de registros por segundo
                    const avgRecordsPerSecond = successfulLogs.reduce((acc: number, log: any) => {
                      const start = new Date(log.started_at).getTime();
                      const end = new Date(log.finished_at).getTime();
                      const duration = Math.max((end - start) / 1000, 1); // duração em segundos
                      return acc + (log.records_synced / duration);
                    }, 0) / successfulLogs.length;
                    
                    // Estimar tempo para sincronizar todos os registros atuais
                    const estimatedSeconds = detailStats.totalRecords / avgRecordsPerSecond;
                    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
                    
                    return (
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Tempo Estimado</h3>
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={16} className="text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">
                              {estimatedMinutes < 1 
                                ? 'Menos de 1 minuto'
                                : estimatedMinutes === 1
                                ? 'Aproximadamente 1 minuto'
                                : `Aproximadamente ${estimatedMinutes} minutos`
                              }
                            </span>
                          </div>
                          <p className="text-xs text-blue-700 mt-1">
                            Baseado no histórico de {successfulLogs.length} sincronização(ões) anterior(es)
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {detailStats.companyStats && detailStats.companyStats.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Por Empresa</h3>
                      <div className="space-y-2">
                        {detailStats.companyStats.map((stat: any, index: number) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Building size={16} className="text-blue-600" />
                                <span className="text-sm font-medium text-gray-900">{stat.company_name || 'N/A'}</span>
                              </div>
                              <span className="text-sm font-semibold text-gray-900">
                                {stat.record_count?.toLocaleString('pt-BR') || '0'} registros
                              </span>
                            </div>
                            {stat.min_date && stat.max_date && (
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(stat.min_date).toLocaleDateString('pt-BR')} até {new Date(stat.max_date).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailStats.logs && detailStats.logs.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Histórico</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {detailStats.logs.map((log: any) => (
                          <div key={log.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-medium ${
                                log.status === 'success' ? 'text-green-600' :
                                log.status === 'error' ? 'text-red-600' :
                                'text-blue-600'
                              }`}>
                                {log.status === 'success' ? 'Sucesso' :
                                 log.status === 'error' ? 'Erro' :
                                 'Em execução'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(log.created_at).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            {log.records_synced !== null && (
                              <p className="text-xs text-gray-600">
                                {log.records_synced.toLocaleString('pt-BR')} registros sincronizados
                              </p>
                            )}
                            {log.error_message && (
                              <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Nenhum dado disponível</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Input file oculto para importação */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" onChange={handleFileSelected} className="hidden" />
    </div>
  );
}
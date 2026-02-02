// =====================
// ENUMS
// =====================
export type UserRole = 'master' | 'group_admin' | 'company_admin' | 'user';

// =====================
// ENTIDADES PRINCIPAIS
// =====================

export interface CompanyGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  company_group_id: string;
  name: string;
  slug: string;
  cnpj?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company_group?: CompanyGroup;
}

export interface User {
  id: string;
  auth_id?: string;
  company_group_id?: string;
  company_id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  // Campos calculados
  companies_count?: number;
  // Relacionamentos
  company_group?: CompanyGroup;
  company?: Company;
}

// =====================
// FORMULÁRIOS
// =====================

export interface CompanyGroupFormData {
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface CompanyFormData {
  company_group_id: string;
  name: string;
  slug: string;
  cnpj?: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface UserFormData {
  company_group_id?: string;
  company_id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar_url?: string;
  is_active?: boolean;
}

// =====================
// API RESPONSES
// =====================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =====================
// SESSÃO / AUTH
// =====================

export interface SessionUser {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  role: UserRole;
  company_group_id?: string;
  company_id?: string;
  avatar_url?: string;
}

// =====================
// PRODUTOS
// =====================

export interface Product {
  id: string;
  company_group_id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company_group?: CompanyGroup;
}

export interface ProductFormData {
  company_group_id: string;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

// =====================
// FUNCIONÁRIOS
// =====================

export interface Employee {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  position?: string;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company?: Company & {
    company_group?: CompanyGroup;
  };
}

export interface EmployeeFormData {
  company_id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  position?: string;
  photo_url?: string;
  is_active?: boolean;
}

// =====================
// TURNOS
// =====================

export interface Shift {
  id: string;
  company_group_id: string;
  name: string;
  code?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company_group?: CompanyGroup;
}

export interface ShiftFormData {
  company_group_id: string;
  name: string;
  code?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  is_active?: boolean;
}

// =====================
// MODO DE VENDA
// =====================

export interface SaleMode {
  id: string;
  company_group_id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company_group?: CompanyGroup;
}

export interface SaleModeFormData {
  company_group_id: string;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

// =====================
// DADOS EXTERNOS (POWER BI)
// =====================

export interface ExternalProduct {
  id: string;
  company_group_id: string;
  external_id: string;
  external_code?: string;
  external_company_id?: string;
  name: string;
  description?: string;
  type?: string;
  category?: string;
  product_group?: string;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company_group?: CompanyGroup;
}

export interface ExternalEmployee {
  id: string;
  company_group_id: string;
  external_id: string;
  external_code?: string;
  external_company_id?: string;
  name: string;
  email?: string;
  department?: string;
  position?: string;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company_group?: CompanyGroup;
}

export interface ExternalCompany {
  id: string;
  company_group_id: string;
  external_id: string;
  external_code?: string;
  name: string;
  cnpj?: string;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company_group?: CompanyGroup;
}

// =====================
// MAPEAMENTOS (CONCILIAÇÃO)
// =====================

export interface ProductMapping {
  id: string;
  company_group_id: string;
  product_id: string;
  external_product_id: string;
  created_at: string;
  // Relacionamentos
  product?: Product;
  external_product?: ExternalProduct;
}

export interface EmployeeMapping {
  id: string;
  company_group_id: string;
  employee_id: string;
  external_employee_id: string;
  created_at: string;
  // Relacionamentos
  employee?: Employee;
  external_employee?: ExternalEmployee;
}

export interface CompanyMapping {
  id: string;
  company_group_id: string;
  company_id: string;
  external_company_id: string;
  external_company?: ExternalCompany;
  created_at: string;
  updated_at: string;
}

// =====================
// POWER BI
// =====================

export interface PowerBIConnection {
  id: string;
  company_group_id: string;
  name: string;
  tenant_id: string;
  client_id: string;
  client_secret?: string;
  workspace_id: string;
  is_active: boolean;
  last_sync_at?: string;
  sync_status: 'pending' | 'running' | 'success' | 'error';
  sync_error?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company_group?: CompanyGroup;
  sync_configs?: PowerBISyncConfig[];
}

export interface PowerBISyncConfig {
  id: string;
  connection_id: string;
  entity_type: 'products' | 'employees' | 'companies' | 'sales' | 'cash_flow' | 'cash_flow_statement' | 'categories';
  dataset_id: string;
  dax_query: string;
  field_mapping: Record<string, string>;
  is_active: boolean;
  sync_interval_minutes: number;
  last_sync_at?: string;
  last_sync_count?: number;
  sync_error?: string;
  // Campos incrementais
  date_field?: string;
  initial_date?: string;
  incremental_days?: number;
  is_incremental?: boolean;
  // Relacionamentos
  created_at: string;
  updated_at: string;
  connection?: PowerBIConnection;
}

export interface PowerBISyncLog {
  id: string;
  connection_id: string;
  sync_config_id?: string;
  entity_type: string;
  status: 'running' | 'success' | 'error';
  records_synced: number;
  error_message?: string;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
}

// =====================
// AGENDAMENTOS POWER BI
// =====================

export interface PowerBISyncSchedule {
  id: string;
  sync_config_id: string;
  schedule_type: 'daily' | 'weekly';
  day_of_week?: number; // 0=Dom, 1=Seg... 6=Sab
  time_of_day: string; // HH:MM:SS
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

// =====================
// VENDAS EXTERNAS
// =====================

export interface ExternalSale {
  id: string;
  company_group_id: string;
  external_id: string;
  external_product_id: string;
  external_employee_id?: string;
  external_company_id: string;
  sale_date: string;
  sale_mode?: string;
  period?: string;
  quantity: number;
  total_value: number;
  cost?: number;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// =====================
// CAIXA EXTERNO
// =====================

export interface ExternalCashFlow {
  id: string;
  company_group_id: string;
  external_id: string;
  external_employee_id?: string;
  external_company_id?: string;
  transaction_date: string;
  payment_method?: string;
  transaction_type?: string;
  transaction_mode?: string;
  period?: string;
  amount: number;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PowerBIConnectionFormData {
  company_group_id: string;
  name: string;
  tenant_id: string;
  client_id: string;
  client_secret: string;
  workspace_id: string;
  is_active?: boolean;
}

export interface PowerBISyncConfigFormData {
  connection_id: string;
  entity_type: 'products' | 'employees' | 'companies' | 'sales';
  dataset_id: string;
  dax_query: string;
  field_mapping: Record<string, string>;
  is_active?: boolean;
  sync_interval_minutes?: number;
  // Campos incrementais
  date_field?: string;
  initial_date?: string;
  incremental_days?: number;
  is_incremental?: boolean;
}

// =====================
// FLUXO DE CAIXA EXTERNO (DFC)
// =====================

export interface ExternalCashFlowStatement {
  id: string;
  company_group_id: string;
  external_id: string;
  category_id: string;
  external_company_id?: string;
  transaction_date: string;
  amount: number;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// =====================
// CATEGORIAS EXTERNAS
// =====================

export interface ExternalCategory {
  id: string;
  company_group_id: string;
  external_id: string;
  layer_01?: string;
  layer_02?: string;
  layer_03?: string;
  layer_04?: string;
  external_company_id?: string;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// =====================
// CATEGORIAS (INTERNAS)
// =====================

export interface Category {
  id: string;
  company_group_id: string;
  parent_id?: string;
  name: string;
  code?: string;
  description?: string;
  level: number; // 1-4
  type: 'entrada' | 'saida';
  is_analytical: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  company_group?: CompanyGroup;
  parent?: Category;
  children?: Category[];
}

export interface CategoryFormData {
  company_group_id: string;
  parent_id?: string;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface CategoryMapping {
  id: string;
  company_group_id: string;
  category_id: string;
  external_category_id: string;
  created_at: string;
  // Relacionamentos
  category?: Category;
  external_category?: ExternalCategory;
}

// =====================
// MÓDULO DE COMPRAS
// =====================

export interface RawMaterial {
  id: string;
  company_group_id: string;
  company_id?: string;
  name: string;
  unit: string;
  loss_factor: number;
  min_stock: number;
  current_stock: number;
  category?: string;
  is_resale: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  raw_material_products?: RawMaterialProduct[];
  raw_material_stock?: RawMaterialStock[];
}

export interface RawMaterialProduct {
  id: string;
  raw_material_id: string;
  external_product_id: string;
  quantity_per_unit: number;
  created_at: string;
  updated_at: string;
  external_product?: ExternalProduct;
}

// Vínculo Matéria-Prima ↔ Estoque
export interface RawMaterialStock {
  id: string;
  raw_material_id: string;
  external_stock_id: string;
  created_at: string;
  updated_at: string;
  external_stock?: ExternalStock;
}

export interface InventoryCount {
  id: string;
  company_group_id: string;
  company_id?: string;
  count_date: string;
  status: 'draft' | 'completed';
  notes?: string;
  created_by?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  items?: InventoryCountItem[];
}

export interface InventoryCountItem {
  id: string;
  inventory_count_id: string;
  raw_material_id: string;
  expected_quantity?: number;
  counted_quantity?: number;
  difference?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  raw_material?: RawMaterial;
}

export interface PurchaseProjection {
  id: string;
  company_group_id: string;
  company_id?: string;
  projection_date: string;
  days_ahead: number;
  start_date: string;
  end_date: string;
  base_days: number;
  status: 'draft' | 'approved' | 'ordered';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseProjectionItem[];
}

export interface PurchaseProjectionItem {
  id: string;
  projection_id: string;
  raw_material_id: string;
  avg_daily_consumption: number;
  projected_consumption: number;
  loss_amount: number;
  current_stock: number;
  min_stock: number;
  calculated_quantity: number;
  adjustment_factor: number;
  adjustment_reason?: string;
  final_quantity: number;
  created_at: string;
  updated_at: string;
  raw_material?: RawMaterial;
}

// =====================
// ESTOQUE EXTERNO
// =====================

export interface ExternalStock {
  id: string;
  company_group_id: string;
  external_product_id: string;
  external_company_id?: string;
  product_name?: string;
  product_group?: string;
  unit?: string;
  purchase_unit?: string;
  conversion_factor?: number;
  min_quantity: number;
  max_quantity: number;
  quantity: number;
  last_cost?: number;
  average_cost?: number;
  updated_at_external?: string;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
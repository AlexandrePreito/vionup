'use client';

import {
  PieChart,
  User,
  CheckCircle2,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export interface FinancialGoalItem {
  id: string;
  category_id?: string;
  category_name: string;
  category_type: string;
  category_code: string | null;
  company_id?: string | null;
  company_name: string;
  goal_type: string;
  goal_value: number;
  realized_value: number;
  realized_percentage: number;
  total_revenue?: number;
  progress: number;
  status: 'achieved' | 'ontrack' | 'behind';
  responsibles: { id: string; name: string; role: string | null }[];
  description: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'achieved': return 'text-emerald-600';
    case 'ontrack': return 'text-amber-500';
    case 'behind': return 'text-red-500';
    default: return 'text-gray-500';
  }
};

const getStatusBgColor = (status: string) => {
  switch (status) {
    case 'achieved': return 'bg-emerald-100';
    case 'ontrack': return 'bg-amber-100';
    case 'behind': return 'bg-red-100';
    default: return 'bg-gray-100';
  }
};

const getProgressBarColor = (status: string) => {
  switch (status) {
    case 'achieved': return 'bg-emerald-500';
    case 'ontrack': return 'bg-amber-500';
    case 'behind': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

const getStatusLabel = (status: string, isSaida: boolean) => {
  if (isSaida) {
    switch (status) {
      case 'achieved': return 'Atingida (gastou menos)';
      case 'ontrack': return 'No Caminho';
      case 'behind': return 'Acima do esperado';
      default: return status;
    }
  }
  switch (status) {
    case 'achieved': return 'Atingida';
    case 'ontrack': return 'No Caminho';
    case 'behind': return 'Atenção';
    default: return status;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'achieved': return <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />;
    case 'ontrack': return <TrendingUp size={14} className="text-amber-500 shrink-0" />;
    case 'behind': return <AlertTriangle size={14} className="text-red-500 shrink-0" />;
    default: return null;
  }
};

const getRealizedColor = (goal: FinancialGoalItem, isSaida: boolean) => {
  if (!isSaida) return 'text-emerald-600';
  const effectiveRealized = goal.goal_type === 'percentage' ? goal.realized_percentage : goal.realized_value;
  return effectiveRealized <= goal.goal_value ? 'text-emerald-600' : 'text-red-500';
};

export interface CompanyColor {
  light: string;
  text: string;
  border: string;
  hex: string;
}

export function FinancialGoalCard({
  goal,
  formatCurrency,
  isSaida,
  variant = 'destaque',
  companyColor
}: {
  goal: FinancialGoalItem;
  formatCurrency: (v: number) => string;
  isSaida: boolean;
  variant?: 'destaque' | 'menor';
  companyColor?: CompanyColor;
}) {
  const isMenor = variant === 'menor';
  return (
    <div
      className={`bg-white rounded-2xl border relative overflow-hidden transition-shadow ${isMenor ? 'shadow p-4' : 'shadow-lg border-gray-100 p-6 ring-2 ring-blue-100'}`}
      style={isMenor && companyColor ? { borderColor: `${companyColor.hex}40`, borderWidth: 2 } : undefined}
    >
      {!isMenor && <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-bl-full" />}
      <div className="relative">
        <div className={`flex items-start justify-between gap-4 ${isMenor ? 'mb-2' : 'mb-3'}`}>
          <div className={`flex items-center gap-3 min-w-0 ${isMenor ? 'gap-2' : ''}`}>
            <div
              className={`${isMenor ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} flex items-center justify-center shrink-0 ${isMenor && companyColor ? companyColor.light : getStatusBgColor(goal.status)}`}
            >
              <PieChart
                className={`${isMenor ? 'w-4 h-4' : 'w-5 h-5'} ${!companyColor ? getStatusColor(goal.status) : ''}`}
                style={companyColor ? { color: companyColor.hex } : undefined}
              />
            </div>
            <div className="min-w-0">
              <h3 className={`text-gray-900 truncate ${isMenor ? 'text-sm font-medium' : 'font-semibold'}`}>
                {goal.category_code ? `${goal.category_code} - ` : ''}{goal.category_name}
              </h3>
              <p
                className={`${isMenor ? 'text-xs' : 'text-sm'} ${!isMenor || !companyColor ? 'text-gray-500' : ''}`}
                style={isMenor && companyColor ? { color: companyColor.hex } : undefined}
              >
                {goal.company_name}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full shrink-0 ${getStatusBgColor(goal.status)} ${isMenor ? 'px-2 py-0.5' : 'px-2.5 py-1'}`}>
            {getStatusIcon(goal.status)}
            <span className={`font-medium ${getStatusColor(goal.status)} ${isMenor ? 'text-[10px]' : 'text-xs'}`}>
              {getStatusLabel(goal.status, isSaida)}
            </span>
          </div>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isMenor ? 'gap-2 mb-2' : 'gap-4 mb-4'}`}>
          <div>
            <p className={`text-gray-500 ${isMenor ? 'text-xs' : 'text-sm'}`}>Meta</p>
            <p className={`text-gray-900 ${isMenor ? 'text-sm font-medium' : 'font-semibold'}`}>
              {goal.goal_type === 'value'
                ? formatCurrency(goal.goal_value)
                : `${goal.goal_value}% do faturamento`}
            </p>
          </div>
          <div>
            <p className={`text-gray-500 ${isMenor ? 'text-xs' : 'text-sm'}`}>Realizado</p>
            <p
              className={`${isMenor && companyColor ? '' : getRealizedColor(goal, isSaida)} ${isMenor ? 'text-sm font-medium' : 'font-semibold'}`}
              style={isMenor && companyColor ? { color: isSaida && goal.status === 'behind' ? '#ef4444' : companyColor.hex } : undefined}
            >
              {goal.goal_type === 'value'
                ? formatCurrency(goal.realized_value)
                : <>
                    {formatCurrency(goal.realized_value)} ({goal.realized_percentage.toFixed(1)}% de {formatCurrency(goal.total_revenue ?? 0)})
                  </>}
            </p>
          </div>
        </div>

        <div className={isMenor ? 'mb-2' : 'mb-4'}>
          <div className={`bg-gray-100 rounded-full overflow-hidden ${isMenor ? 'h-2' : 'h-4'}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${isMenor && companyColor && (!isSaida || goal.status !== 'behind') ? '' : getProgressBarColor(goal.status)}`}
              style={{
                width: `${Math.min(goal.progress, 100)}%`,
                ...(isMenor && companyColor
                  ? { backgroundColor: isSaida && goal.status === 'behind' ? '#ef4444' : companyColor.hex }
                  : {})
              }}
            />
          </div>
          <p className={`text-gray-500 mt-1 ${isMenor ? 'text-[10px]' : 'text-xs'}`}>{goal.progress.toFixed(1)}% do esperado</p>
        </div>

        {!isMenor && goal.responsibles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {goal.responsibles.map(r => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
              >
                <User size={12} />
                {r.role ? `${r.name} (${r.role})` : r.name}
              </span>
            ))}
          </div>
        ) : !isMenor ? (
          <p className="text-sm italic text-gray-400">Sem responsável</p>
        ) : null}

        {!isMenor && goal.description && (
          <p className="mt-3 text-sm italic text-gray-500">{goal.description}</p>
        )}
      </div>
    </div>
  );
}

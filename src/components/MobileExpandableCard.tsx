'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_BREAKPOINT = 768;

interface MobileExpandableCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  /** Conteúdo extra no header do modal (ex: botão exportar) */
  headerAction?: React.ReactNode;
}

/**
 * Em mobile: mostra apenas um card compacto (sem conteúdo).
 * Ao clicar, abre em tela cheia com o conteúdo.
 * Em desktop: mostra o conteúdo normalmente.
 */
export function MobileExpandableCard({
  title,
  subtitle,
  children,
  className = '',
  headerAction,
}: MobileExpandableCardProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isMobile && isExpanded) setIsExpanded(false);
  }, [isMobile, isExpanded]);

  useEffect(() => {
    if (isExpanded) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isExpanded]);

  return (
    <>
      <div className={cn('relative', className)}>
        {isMobile ? (
          /* Mobile: card compacto clicável, sem gráfico */
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full text-left bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 active:bg-gray-50 transition-all touch-manipulation"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-gray-900 truncate">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>}
              </div>
              <ChevronRight size={22} className="flex-shrink-0 text-gray-400" />
            </div>
          </button>
        ) : (
          /* Desktop: conteúdo completo */
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            {children}
          </div>
        )}
      </div>

      {/* Modal fullscreen mobile */}
      {isMobile && isExpanded && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shrink-0 gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-900 truncate">{title}</h3>
              {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {headerAction}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-4">
            {children}
          </div>
        </div>
      )}
    </>
  );
}

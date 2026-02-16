'use client';

import { useState, useEffect } from 'react';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_BREAKPOINT = 768;

interface ChartExpandableProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  /** Altura do gráfico no estado normal (mobile) */
  defaultHeight?: number;
  /** Altura do gráfico expandido */
  expandedHeight?: number;
}

export function ChartExpandable({
  title,
  subtitle,
  children,
  className = '',
  defaultHeight = 220,
  expandedHeight = 320,
}: ChartExpandableProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fechar ao sair de mobile
  useEffect(() => {
    if (!isMobile && isExpanded) setIsExpanded(false);
  }, [isMobile, isExpanded]);

  // Bloquear scroll do body quando expandido
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  return (
    <>
      <div className={cn('relative', className)}>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {isMobile && (
            <button
              onClick={() => setIsExpanded(true)}
              className="flex-shrink-0 p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200 transition-colors touch-manipulation"
              aria-label="Expandir gráfico"
              title="Expandir"
            >
              <Maximize2 size={20} />
            </button>
          )}
        </div>

        {!isExpanded && (
          <div
            className="w-full overflow-hidden"
            style={isMobile ? { height: defaultHeight } : undefined}
          >
            {children}
          </div>
        )}
      </div>

      {/* Modal fullscreen para mobile - gráfico expandido */}
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 z-[200] bg-white flex flex-col"
          style={{ touchAction: 'pan-x' }}
        >
          {/* Header do modal */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shrink-0">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
              aria-label="Fechar"
            >
              <X size={22} />
            </button>
          </div>

          {/* Gráfico em tela cheia horizontal */}
          <div className="flex-1 min-h-0 p-4 overflow-auto -mx-4">
            <div
              className="w-full"
              style={{
                minWidth: 360,
                height: typeof window !== 'undefined' ? Math.max(300, window.innerHeight - 140) : 400,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

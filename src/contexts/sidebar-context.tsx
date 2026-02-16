'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';

type ActiveSection = 'cadastros' | 'config' | 'powerbi' | 'compras' | 'metas' | 'dashboard' | 'nps' | null;

interface SidebarContextType {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Detectar seção ativa baseado na rota
  useEffect(() => {
    if (pathname.startsWith('/cadastros') || pathname.startsWith('/conciliacao/funcionarios') || pathname.startsWith('/conciliacao/produtos') || pathname.startsWith('/conciliacao/categorias')) {
      setActiveSection('cadastros');
    } else if (pathname.startsWith('/grupos') || pathname.startsWith('/empresas') || pathname.startsWith('/usuarios') || pathname.startsWith('/conciliacao')) {
      setActiveSection('config');
    } else if (pathname.startsWith('/powerbi') || pathname.startsWith('/dashboard/importar')) {
      setActiveSection('powerbi');
    } else if (pathname.startsWith('/compras')) {
      setActiveSection('compras');
    } else if (pathname.startsWith('/metas')) {
      setActiveSection('metas');
    } else if (pathname.startsWith('/dashboard')) {
      setActiveSection('dashboard');
    } else if (pathname.startsWith('/nps')) {
      setActiveSection('nps');
    }
  }, [pathname]);

  return (
    <SidebarContext.Provider value={{ activeSection, setActiveSection, isExpanded, setIsExpanded, isMobileMenuOpen, setIsMobileMenuOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

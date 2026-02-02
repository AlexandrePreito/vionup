'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Rocket, BarChart3, Users, Package, DollarSign, TrendingUp, 
  Building2, ShoppingCart, Calendar, FileText, Settings, 
  ChevronRight, Star, Zap, Target, PieChart, ArrowUpRight,
  Truck, ClipboardList, MessageSquare, Database, RefreshCw,
  Shield, Clock, CheckCircle2, Sparkles, ArrowRight, Check,
  AlertCircle, LogIn
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Componente de contador animado
function AnimatedCounter({ end, duration = 2000, prefix = '', suffix = '', decimals = 0 }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = easeOutQuart * end;
      
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, isVisible]);

  const formattedCount = decimals > 0 
    ? count.toFixed(decimals).replace('.', ',')
    : Math.floor(count).toLocaleString('pt-BR');

  return (
    <span ref={countRef}>
      {prefix}{formattedCount}{suffix}
    </span>
  );
}

// Componente de barra de progresso animada
function AnimatedProgress({ progress, color = 'bg-amber-400', delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(Math.min(progress, 100));
    }, delay);
    return () => clearTimeout(timer);
  }, [progress, delay]);

  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    const featureInterval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 4);
    }, 3000);

    return () => {
      clearInterval(featureInterval);
    };
  }, []);

  // Dados das metas principais
  const mainStats = [
    { 
      label: 'Faturamento do Mês', 
      value: 577741.04, 
      meta: 825000, 
      prefix: 'R$ ', 
      decimals: 2,
      icon: DollarSign, 
      color: 'bg-amber-400',
      bgLight: 'bg-amber-50',
      status: 'on-track'
    },
    { 
      label: 'Vendas Hoje', 
      value: 47892.50, 
      meta: 55000, 
      prefix: 'R$ ', 
      decimals: 2,
      icon: TrendingUp, 
      color: 'bg-emerald-400',
      bgLight: 'bg-emerald-50',
      status: 'success'
    },
    { 
      label: 'Produtos Vendidos', 
      value: 1247, 
      meta: 1500, 
      prefix: '', 
      decimals: 0,
      icon: Package, 
      color: 'bg-blue-400',
      bgLight: 'bg-blue-50',
      status: 'on-track'
    },
    { 
      label: 'NPS Score', 
      value: 87, 
      meta: 90, 
      prefix: '', 
      suffix: '%',
      decimals: 0,
      icon: MessageSquare, 
      color: 'bg-purple-400',
      bgLight: 'bg-purple-50',
      status: 'success'
    }
  ];

  const modules = [
    {
      icon: BarChart3,
      title: 'Dashboard Empresa',
      description: 'Visão geral de metas e performance',
      color: 'from-blue-500 to-cyan-400',
      bgLight: 'bg-blue-50',
      iconBg: 'bg-blue-500',
      href: '/dashboard/empresa'
    },
    {
      icon: TrendingUp,
      title: 'Dashboard Vendas',
      description: 'Análise detalhada de vendas',
      color: 'from-emerald-500 to-teal-400',
      bgLight: 'bg-emerald-50',
      iconBg: 'bg-emerald-500',
      href: '/dashboard/vendas'
    },
    {
      icon: MessageSquare,
      title: 'Dashboard NPS',
      description: 'Feedbacks e satisfação',
      color: 'from-purple-500 to-pink-400',
      bgLight: 'bg-purple-50',
      iconBg: 'bg-purple-500',
      href: '/dashboard/nps'
    },
    {
      icon: Target,
      title: 'Previsão de Vendas',
      description: 'Projeções com IA',
      color: 'from-orange-500 to-amber-400',
      bgLight: 'bg-orange-50',
      iconBg: 'bg-orange-500',
      href: '/dashboard/previsao'
    },
    {
      icon: Package,
      title: 'Produtos',
      description: 'Catálogo e gestão',
      color: 'from-indigo-500 to-blue-400',
      bgLight: 'bg-indigo-50',
      iconBg: 'bg-indigo-500',
      href: '/cadastros/produtos'
    },
    {
      icon: Users,
      title: 'Funcionários',
      description: 'Equipe e performance',
      color: 'from-rose-500 to-red-400',
      bgLight: 'bg-rose-50',
      iconBg: 'bg-rose-500',
      href: '/cadastros/funcionarios'
    },
    {
      icon: ShoppingCart,
      title: 'Matérias-Primas',
      description: 'Controle de insumos',
      color: 'from-lime-500 to-green-400',
      bgLight: 'bg-lime-50',
      iconBg: 'bg-lime-600',
      href: '/compras/materias-primas'
    },
    {
      icon: DollarSign,
      title: 'Metas de Vendas',
      description: 'Objetivos e metas',
      color: 'from-yellow-500 to-orange-400',
      bgLight: 'bg-yellow-50',
      iconBg: 'bg-yellow-500',
      href: '/metas/vendas'
    },
    {
      icon: Database,
      title: 'Sincronização',
      description: 'Integração Power BI',
      color: 'from-cyan-500 to-blue-400',
      bgLight: 'bg-cyan-50',
      iconBg: 'bg-cyan-500',
      href: '/powerbi/sincronizacao'
    },
  ];

  const features = [
    { icon: Zap, text: 'Sincronização em tempo real', color: 'text-amber-500' },
    { icon: Shield, text: 'Dados seguros na nuvem', color: 'text-emerald-500' },
    { icon: Clock, text: 'Relatórios instantâneos', color: 'text-blue-500' },
    { icon: Sparkles, text: 'Insights com IA', color: 'text-purple-500' }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <Check className="w-4 h-4 text-white" />;
      case 'danger':
        return <AlertCircle className="w-4 h-4 text-white" />;
      default:
        return <ArrowRight className="w-4 h-4 text-white" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-500';
      case 'danger':
        return 'bg-red-500';
      default:
        return 'bg-amber-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'success':
        return 'Atingido';
      case 'danger':
        return 'Atenção';
      default:
        return 'No Caminho';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Rocket Logo - Ícone azul degradê */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Rocket className="w-5 h-5 text-white transform -rotate-45" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Vion Up!
                </h1>
                <p className="text-xs text-gray-400">Inteligência em metas</p>
              </div>
            </div>
            
            {/* Botão Entrar */}
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-12">
        <div className={`text-center mb-12 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-6">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-blue-700 font-medium">Gestão inteligente para seu negócio</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gray-900">Decole seus resultados,</span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              controle suas metas
            </span>
          </h2>
          
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
            Controle total sobre vendas, metas, estoque e performance.
          </p>

          {/* Animated Features */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-500 ${
                  activeFeature === index 
                    ? 'bg-white shadow-lg scale-105 border border-gray-100' 
                    : 'bg-transparent'
                }`}
              >
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
                <span className={`text-sm font-medium ${activeFeature === index ? 'text-gray-900' : 'text-gray-400'}`}>
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Cards - Estilo Metas */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {mainStats.map((stat, index) => {
            const progress = (stat.value / stat.meta) * 100;
            return (
              <div 
                key={index}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bgLight || 'bg-gray-50'}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${getStatusColor(stat.status)}`}>
                    {getStatusIcon(stat.status)}
                    <span className="text-xs font-medium text-white">{getStatusLabel(stat.status)}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-medium text-gray-500 mb-1">{stat.label}</h3>

                {/* Values */}
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <span className="text-xs text-gray-400">Realizado</span>
                    <div className={`text-2xl font-bold ${stat.status === 'success' ? 'text-emerald-600' : stat.status === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>
                      <AnimatedCounter 
                        end={stat.value} 
                        prefix={stat.prefix} 
                        suffix={stat.suffix || ''} 
                        decimals={stat.decimals}
                        duration={2000 + index * 200}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Meta</span>
                    <div className="text-lg font-semibold text-gray-900">
                      {stat.prefix}{stat.meta.toLocaleString('pt-BR', { minimumFractionDigits: stat.decimals, maximumFractionDigits: stat.decimals })}{stat.suffix || ''}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <AnimatedProgress 
                  progress={progress} 
                  color={stat.color}
                  delay={500 + index * 100}
                />
                
                {/* Percentage */}
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-400">Progresso</span>
                  <span className={`text-sm font-semibold ${stat.status === 'success' ? 'text-emerald-600' : stat.status === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>
                    <AnimatedCounter end={progress} decimals={1} suffix="%" duration={2000 + index * 200} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Title */}
        <div className={`flex items-center justify-between mb-8 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Módulos do Sistema</h3>
            <p className="text-gray-500">Acesse todas as funcionalidades</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>9 módulos disponíveis</span>
          </div>
        </div>

        {/* Modules Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-700 delay-400 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {modules.map((module, index) => (
            <a
              key={index}
              href={module.href}
              className={`group relative bg-white rounded-2xl border border-gray-100 p-5 
                         hover:border-gray-200 hover:shadow-xl transition-all duration-300 
                         hover:-translate-y-1 cursor-pointer overflow-hidden`}
              style={{ 
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.5s ease ${400 + index * 50}ms`
              }}
            >
              {/* Hover Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              {/* Icon */}
              <div className={`w-11 h-11 ${module.iconBg} rounded-xl flex items-center justify-center mb-4 
                             shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <module.icon className="w-5 h-5 text-white" />
              </div>
              
              {/* Content */}
              <h4 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {module.title}
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                {module.description}
              </p>
              
              {/* Arrow */}
              <div className="flex items-center text-sm text-gray-400 group-hover:text-blue-500 transition-colors">
                <span className="font-medium">Acessar</span>
                <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 mt-12 bg-white/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-white transform -rotate-45" />
            </div>
            <span className="text-sm text-gray-500">Vion Up! © 2025 - Todos os direitos reservados</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-xs text-gray-400">Última sync: há 2 min</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-xs text-gray-400">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

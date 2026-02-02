'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Rocket, Target, TrendingUp, Zap, Shield, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Componente de número animado com contador
function AnimatedCounter({ end, duration = 2000, prefix = '', suffix = '' }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(easeOutQuart * end);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isVisible]);

  return (
    <span>
      {prefix}{Math.floor(count).toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

// Card de métrica animado
function MetricCard({ icon: Icon, value, label, suffix = '', prefix = '', delay, color }: { 
  icon: any; 
  value: number; 
  label: string; 
  suffix?: string;
  prefix?: string;
  delay: number;
  color: string;
}) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-sm transition-all duration-700 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {show && <AnimatedCounter end={value} prefix={prefix} suffix={suffix} duration={2000 + delay} />}
      </p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

// Feature item animado
function FeatureItem({ icon: Icon, text, delay }: { icon: any; text: string; delay: number }) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`flex items-center gap-3 transition-all duration-500 ${
        show ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
    >
      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <span className="text-gray-700 text-sm">{text}</span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);

    if (result.success) {
      setTransitioning(true);
      setTimeout(() => {
        router.push('/dashboard/previsao');
      }, 800);
    } else {
      setError(result.error || 'Email ou senha inválidos');
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`min-h-screen flex ${transitioning ? 'page-transition' : ''}`} suppressHydrationWarning>
        {/* Lado esquerdo - Branding Vion Up! */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          {/* Gradiente de fundo azul claro */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50" />
          
          {/* Efeitos de luz */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/30 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          
          {/* Pattern de fundo */}
          <div className="absolute inset-0 opacity-[0.05]" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />

          {/* Conteúdo */}
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            {/* Logo */}
            <div className={`flex items-center gap-3 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Rocket className="w-6 h-6 text-white transform -rotate-45" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vion Up!</h1>
                <p className="text-sm text-gray-600">Inteligência em metas</p>
              </div>
            </div>

            {/* Centro - Métricas */}
            <div className="flex-1 flex flex-col justify-center">
              {/* Título */}
              <div className={`mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <h2 className="text-4xl font-bold text-gray-900 mb-2">
                  Decole seus resultados,
                </h2>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  controle suas metas
                </h2>
              </div>

              {/* Cards de métricas */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <MetricCard 
                  icon={TrendingUp} 
                  value={577741} 
                  prefix="R$ " 
                  label="Faturamento do mês" 
                  delay={200}
                  color="bg-emerald-500"
                />
                <MetricCard 
                  icon={Target} 
                  value={87} 
                  suffix="%" 
                  label="Meta atingida" 
                  delay={400}
                  color="bg-amber-500"
                />
                <MetricCard 
                  icon={BarChart3} 
                  value={1247} 
                  label="Produtos vendidos" 
                  delay={600}
                  color="bg-purple-500"
                />
                <MetricCard 
                  icon={Zap} 
                  value={12} 
                  label="Unidades ativas" 
                  delay={800}
                  color="bg-rose-500"
                />
              </div>

              {/* Features */}
              <div className="space-y-3">
                <FeatureItem icon={Zap} text="Sincronização em tempo real com Power BI" delay={1000} />
                <FeatureItem icon={Shield} text="Dados seguros na nuvem" delay={1200} />
                <FeatureItem icon={Target} text="Acompanhamento de metas inteligente" delay={1400} />
              </div>
            </div>

            {/* Rodapé */}
            <div className={`transition-all duration-700 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-sm text-gray-500">
                © 2025 Vion Up! - Todos os direitos reservados
              </p>
            </div>
          </div>

          {/* Foguete flutuante decorativo */}
          <div 
            className="absolute bottom-20 right-12 opacity-5"
            style={{ animation: 'float 6s ease-in-out infinite' }}
          >
            <Rocket className="w-32 h-32 text-blue-400 transform -rotate-45" />
          </div>
        </div>

        {/* Lado direito - Formulário */}
        <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 ${transitioning ? 'form-transition' : ''}`}>
          <div className={`w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Logo mobile */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white transform -rotate-45" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Vion Up!</h1>
                <p className="text-xs text-gray-400">Inteligência em metas</p>
              </div>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                Bem-vindo de volta
              </h1>
              <p className="text-gray-500 mt-2">
                Entre com suas credenciais para acessar o sistema
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              {/* Campo Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3.5 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Entrar
                  </>
                )}
              </button>
            </form>

            {/* Rodapé mobile */}
            <div className="lg:hidden mt-8 text-center">
              <p className="text-xs text-gray-400">
                © 2025 Vion Up! - Todos os direitos reservados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay de transição */}
      {transitioning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500 transition-overlay">
          <div className="flex flex-col items-center gap-4 transition-spinner">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center animate-bounce">
              <Rocket className="w-8 h-8 text-white transform -rotate-45" />
            </div>
            <p className="text-white font-medium">Carregando...</p>
          </div>
        </div>
      )}

      {/* CSS das animações */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-45deg); }
          50% { transform: translateY(-20px) rotate(-45deg); }
        }
        
        .page-transition {
          animation: fadeOut 0.5s ease forwards;
        }
        
        .form-transition {
          animation: slideOut 0.5s ease forwards;
        }
        
        .transition-overlay {
          animation: fadeIn 0.3s ease forwards;
        }
        
        .transition-spinner {
          animation: scaleIn 0.3s ease forwards;
        }
        
        @keyframes fadeOut {
          to { opacity: 0; }
        }
        
        @keyframes slideOut {
          to { transform: translateX(20px); opacity: 0; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

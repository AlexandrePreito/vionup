'use client';

// Componente Rocket com gradiente (mesmo da página de login)
function RocketIcon({ className = "w-16 h-16", rotate = false }: { className?: string; rotate?: boolean }) {
  // ID fixo para evitar problemas de hidratação
  // Cada SVG tem seu próprio namespace, então não há risco de colisão
  const gradientId = 'rocketGradient-loading';
  
  return (
    <svg 
      className={`${className} ${rotate ? 'transform -rotate-45' : ''}`} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path 
        d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" 
        stroke={`url(#${gradientId})`}
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" 
        stroke={`url(#${gradientId})`}
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ message = 'Carregando...', fullScreen = true }: LoadingScreenProps) {
  return (
    <>
      <div className={`${fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0'} flex items-center justify-center bg-white`}>
        <div className="flex flex-col items-center gap-4">
          <RocketIcon className="w-16 h-16 rocket-flying" rotate={true} />
          <p className="text-gray-700 font-medium">{message}</p>
        </div>
      </div>
      
      {/* CSS das animações */}
      <style jsx global>{`
        @keyframes rocketFly {
          0% { 
            transform: translateY(0px) translateX(0px) rotate(-45deg);
          }
          25% { 
            transform: translateY(-15px) translateX(10px) rotate(-45deg);
          }
          50% { 
            transform: translateY(-25px) translateX(20px) rotate(-45deg);
          }
          75% { 
            transform: translateY(-15px) translateX(10px) rotate(-45deg);
          }
          100% { 
            transform: translateY(0px) translateX(0px) rotate(-45deg);
          }
        }
        
        .rocket-flying {
          animation: rocketFly 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

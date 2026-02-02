'use client';

import { Rocket } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 animate-bounce">
          <Rocket className="w-8 h-8 text-white transform -rotate-45" />
        </div>
        <p className="text-gray-600 font-medium">Carregando...</p>
      </div>
    </div>
  );
}

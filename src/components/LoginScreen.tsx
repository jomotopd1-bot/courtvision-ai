import React from 'react';
import { signInWithGoogle } from '../lib/firebase.js';
import { Activity, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginScreen({ onGuestLogin }: { onGuestLogin?: () => void }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Error signing in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-orange-600 selection:text-white">
      <div className="max-w-md w-full bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-600/35">
              <Activity className="w-8 h-8" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2 mb-2">
              COURTVISION<span className="text-orange-500">.AI</span>
            </h1>
            <p className="text-sm text-neutral-400">
              Inicia sesión para sincronizar tus ligas, guardar tus análisis de draft y acceder desde cualquier dispositivo.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-100 text-neutral-900 font-bold py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continuar con Google
                </>
              )}
            </button>

            {onGuestLogin && (
              <button
                onClick={onGuestLogin}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-4 rounded-xl transition duration-200"
              >
                Continuar como Invitado (Modo Demo)
              </button>
            )}
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Autenticación segura proporcionada por Firebase</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <Zap className="w-4 h-4 text-orange-500 shrink-0" />
              <span>Tus preferencias y equipos se guardan en la nube</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext.js';
import { BackgroundEffects } from './components/BackgroundEffects.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { Auth } from './pages/Auth.js';
import { PrivacyPolicy } from './pages/PrivacyPolicy.js';
import { TermsOfService } from './pages/TermsOfService.js';
import { Cigano } from './pages/Cigano.js';
import { Interpretacoes } from './pages/Interpretacoes.js';

/**
 * Magia das Crenças — o Reino Encantado das Cartas.
 * Ferramenta exclusiva do Cigano: tela inicial = mesa e conversa com o Cigano (estilo ChatGPT).
 */
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authReady } = useApp();
  if (!authReady) return <div className="min-h-screen bg-black flex items-center justify-center text-[#D4AF37] text-sm">Preparando a mesa…</div>;
  return user ? <>{children}</> : <Navigate to="/auth?tab=login" replace />;
};

function AppContent() {
  const location = useLocation();
  const telaDoCigano = location.pathname === '/' || location.pathname === '/interpretacoes';

  return (
    <div className="relative min-h-screen font-sans antialiased text-white selection:bg-red-800 selection:text-white flex flex-col overflow-x-hidden">
      {!telaDoCigano && <BackgroundEffects />}
      {!telaDoCigano && (
        <header className="relative z-20 flex items-center gap-3 px-4 py-3 border-b border-[#D4AF37]/20 bg-black/70">
          <Link to="/" className="flex items-center gap-2">
            <img src="/image/cigano-avatar.webp" alt="" className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]/60" />
            <span className="font-serif text-sm text-[#D4AF37] font-bold">Magia das Crenças — o Reino Encantado das Cartas</span>
          </Link>
        </header>
      )}
      <main className="relative z-10 w-full flex-1">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<PrivateRoute><Cigano /></PrivateRoute>} />
            <Route path="/interpretacoes" element={<PrivateRoute><Interpretacoes /></PrivateRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsOfService />} />
            <Route path="/chat" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Navigate to="/auth?tab=login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {!telaDoCigano && (
        <footer className="relative z-20 border-t border-red-950/60 bg-black/90 py-4 px-4 text-center text-xs text-gray-400 flex justify-center gap-6">
          <Link to="/termos" className="hover:text-[#D4AF37]">Termos de uso</Link>
          <Link to="/privacidade" className="hover:text-[#D4AF37]">Política de privacidade</Link>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

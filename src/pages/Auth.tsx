import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext.js';
import { motion } from 'motion/react';
import { Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2, KeyRound } from 'lucide-react';

/** Entrada da mesa do Cigano — só o dono tem conta. */
export const Auth: React.FC = () => {
  const { user, login, resetPassword, isAuthenticating } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setAviso('');
    if (!email || !senha) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }
    try {
      await login(email.trim(), senha);
      navigate('/');
    } catch (err: any) {
      setErro(err?.message || 'Não consegui abrir a porta. Confira os dados.');
    }
  };

  const recuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErro('Escreva o e-mail para eu mandar o link.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      await resetPassword(email.trim());
      setModoRecuperar(false);
      setAviso('Mandei o link para trocar a senha. Olhe a sua caixa de entrada.');
    } catch (err: any) {
      setErro(err?.message || 'Não consegui mandar o link agora.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10 text-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-black/80 p-6 md:p-8 backdrop-blur-md shadow-[0_0_40px_rgba(212,175,55,0.18)]"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/image/cigano.webp"
            alt="O Cigano"
            className="h-40 w-32 rounded-xl border border-[#D4AF37]/50 object-cover object-top shadow-[0_0_25px_rgba(212,175,55,0.35)]"
          />
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-wide text-[#D4AF37]">Eu sou o Cigano</h1>
          <p className="mt-1 text-sm text-gray-300">Magia das Crenças — o Reino Encantado das Cartas</p>
          <p className="mt-3 text-xs text-gray-400">Entre com a sua conta para abrir a mesa. Esta mesa é só do dono.</p>
        </div>

        {erro && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
        {aviso && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-950/40 p-3 text-xs text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{aviso}</span>
          </div>
        )}

        <form onSubmit={modoRecuperar ? recuperar : entrar} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">E-mail</span>
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-black/60 px-3 focus-within:border-[#D4AF37]">
              <Mail className="h-4 w-4 text-[#D4AF37]" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm outline-none"
              />
            </div>
          </label>

          {!modoRecuperar && (
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Senha</span>
              <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-black/60 px-3 focus-within:border-[#D4AF37]">
                <Lock className="h-4 w-4 text-[#D4AF37]" />
                <input
                  type={verSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm outline-none"
                />
                <button type="button" onClick={() => setVerSenha((v) => !v)} className="text-gray-400 hover:text-white" aria-label="Mostrar senha">
                  {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          )}

          <button
            type="submit"
            disabled={isAuthenticating || enviando}
            className="w-full rounded-lg bg-gradient-to-r from-[#b8860b] via-[#D4AF37] to-[#b8860b] py-3 text-sm font-bold uppercase tracking-wider text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {modoRecuperar ? (enviando ? 'Enviando…' : 'Mandar link da senha') : isAuthenticating ? 'Abrindo a mesa…' : 'Abrir a mesa'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setModoRecuperar((m) => !m); setErro(''); setAviso(''); }}
          className="mx-auto mt-4 flex items-center gap-1 text-xs text-gray-400 hover:text-[#D4AF37]"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {modoRecuperar ? 'Voltar para entrar' : 'Esqueci a senha'}
        </button>
      </motion.div>
    </div>
  );
};

export default Auth;

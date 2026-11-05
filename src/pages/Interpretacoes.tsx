import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Search } from 'lucide-react';
import { cigano } from '../cigano/client/api.js';
import type { CartaCigano } from '../cigano/metodo.js';
import { CartaVisual } from '../components/cigano/CartaVisual.js';

/** As 78 cartas com as interpretações do Cigano: o dono troca pelas suas e o Cigano passa a usar. */
export function Interpretacoes() {
  const navigate = useNavigate();
  const [cartas, setCartas] = useState<CartaCigano[]>([]);
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<{ luz: string; sombra: string; conselho: string; minhaLeitura: string }>({ luz: '', sombra: '', conselho: '', minhaLeitura: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { cigano.cartas().then((r) => setCartas(r.cartas)).catch((e) => setMsg(e.message)); }, []);

  const filtradas = useMemo(() => {
    const n = busca.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return cartas.filter((c) => !n || c.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(n) || (c.romano || '').toLowerCase() === n);
  }, [cartas, busca]);

  const abrir = (c: CartaCigano) => {
    setAberta(c.id);
    setMsg(null);
    setRascunho({ luz: c.luz, sombra: c.sombra, conselho: c.conselho, minhaLeitura: c.minhaLeitura || '' });
  };

  const salvar = async (id: string) => {
    setSalvando(true);
    try {
      const r = await cigano.salvarCarta({ id, ...rascunho });
      setCartas((p) => p.map((c) => (c.id === id ? r.carta : c)));
      setMsg('Interpretação salva. O Cigano já usa esta leitura nos próximos jogos.');
    } catch (e: any) {
      setMsg(e?.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full rounded-xl bg-white/5 border border-white/15 focus:border-[#d4a937] p-3 text-sm text-white outline-none';

  return (
    <div className="min-h-screen bg-[#050304] text-white" data-testid="interpretacoes">
      <header className="sticky top-0 z-10 bg-[#050304]/95 border-b border-[#d4a937]/20 px-3 sm:px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} aria-label="Voltar" className="w-10 h-10 rounded-xl border border-[#d4a937]/50 flex items-center justify-center cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h1 className="text-sm font-black tracking-widest text-[#f5d67a]">MINHAS INTERPRETAÇÕES</h1>
          <p className="text-[11px] text-slate-400">Tarô de Thoth (Crowley) · 78 cartas · a sua leitura tem prioridade</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-3 sm:p-5 space-y-3">
        <label className="flex items-center gap-2 rounded-xl border border-white/15 px-3 h-11"><Search className="w-4 h-4 text-slate-400" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar carta (ex.: Papisa, Rei de Copas, XVII)" className="flex-1 bg-transparent outline-none text-sm" /></label>
        {msg && <p className="text-xs text-emerald-300">{msg}</p>}
        <ul className="space-y-2">
          {filtradas.map((c) => (
            <li key={c.id} className="rounded-2xl border border-[#d4a937]/25 bg-black/40">
              <button type="button" onClick={() => (aberta === c.id ? setAberta(null) : abrir(c))} className="w-full flex items-center gap-3 p-3 text-left cursor-pointer">
                <CartaVisual carta={c} revelada tamanho="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-[#f5d67a]">{c.romano ? `${c.romano} — ` : ''}{c.nome}</span>
                  <span className="block text-xs text-slate-400 line-clamp-2">{c.minhaLeitura || c.luz}</span>
                </span>
                {c.minhaLeitura && <span className="text-[10px] px-2 py-1 rounded-full bg-pink-500/20 text-pink-200">minha leitura</span>}
              </button>
              {aberta === c.id && (
                <div className="px-3 pb-3 space-y-2">
                  <label className="block text-[11px] text-pink-200">Minha leitura desta carta (o Cigano usa esta primeiro)<textarea className={`${campo} mt-1 h-24`} value={rascunho.minhaLeitura} onChange={(e) => setRascunho({ ...rascunho, minhaLeitura: e.target.value })} /></label>
                  <label className="block text-[11px] text-emerald-300">Luz (lado positivo)<textarea className={`${campo} mt-1 h-16`} value={rascunho.luz} onChange={(e) => setRascunho({ ...rascunho, luz: e.target.value })} /></label>
                  <label className="block text-[11px] text-pink-300">Sombra (lado negativo)<textarea className={`${campo} mt-1 h-16`} value={rascunho.sombra} onChange={(e) => setRascunho({ ...rascunho, sombra: e.target.value })} /></label>
                  <label className="block text-[11px] text-[#f5d67a]">Conselho<textarea className={`${campo} mt-1 h-16`} value={rascunho.conselho} onChange={(e) => setRascunho({ ...rascunho, conselho: e.target.value })} /></label>
                  <button type="button" onClick={() => void salvar(c.id)} disabled={salvando} className="h-11 px-5 rounded-xl bg-[#d4a937] text-black font-black text-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"><Save className="w-4 h-4" /> {salvando ? 'Salvando…' : 'Salvar'}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default Interpretacoes;

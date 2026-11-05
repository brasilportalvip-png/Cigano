import React from 'react';
import { Link } from 'react-router-dom';

/** Termos de uso da mesa do Cigano (ferramenta pessoal do dono). */
export const TermsOfService: React.FC = () => (
  <div className="mx-auto max-w-3xl px-4 py-10 text-white">
    <div className="rounded-2xl border border-[#D4AF37]/30 bg-black/85 p-6 md:p-10 backdrop-blur-md">
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#D4AF37]">Termos de uso</h1>
      <p className="mt-1 text-xs text-gray-400">Magia do Tarot — o Reino Encantado das Cartas · vigência a partir de novembro de 2026</p>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-gray-200">
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">1. O que é esta mesa</h2>
          <p>Esta é a ferramenta pessoal do Cigano. Ela tira as cartas do Tarô de Thoth (Crowley), monta a cruz e lê os dados natais de quem consulta. Só o dono do site tem conta e entra na mesa.</p>
        </section>
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">2. Orientação espiritual</h2>
          <p>As leituras são orientação espiritual e de interpretação. Não prometem resultado certo e não substituem médico, psicólogo, advogado ou consultor financeiro.</p>
        </section>
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">3. Dados de outras pessoas</h2>
          <p>Quando a pergunta envolve outra pessoa, o dono só deve informar os dados natais dela com o consentimento dela, ou com uma razão legítima para a consulta.</p>
        </section>
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">4. Inteligência artificial</h2>
          <p>A voz e o texto do Cigano são gerados por inteligência artificial a partir do método do dono. As cartas são tiradas por embaralhamento aleatório seguro.</p>
        </section>
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">5. Mudanças</h2>
          <p>Estes termos podem mudar. A data de vigência no topo mostra a versão em uso.</p>
        </section>
      </div>
      <Link to="/" className="mt-8 inline-block text-xs text-[#D4AF37] hover:underline">← Voltar para a mesa</Link>
    </div>
  </div>
);

export default TermsOfService;

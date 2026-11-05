import React from 'react';
import { Link } from 'react-router-dom';

/** Política de privacidade da mesa do Cigano (LGPD). */
export const PrivacyPolicy: React.FC = () => (
  <div className="mx-auto max-w-3xl px-4 py-10 text-white">
    <div className="rounded-2xl border border-[#D4AF37]/30 bg-black/85 p-6 md:p-10 backdrop-blur-md">
      <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#D4AF37]">Política de privacidade</h1>
      <p className="mt-1 text-xs text-gray-400">Magia das Crenças — o Reino Encantado das Cartas · vigência a partir de novembro de 2026</p>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-gray-200">
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">1. Quais dados ficam guardados</h2>
          <p>O e-mail do dono, usado para entrar. Em cada consulta: o nome completo, a data e a hora de nascimento de quem consulta (e da outra pessoa, quando a pergunta envolve alguém), as cartas tiradas, as perguntas e as respostas do Cigano.</p>
        </section>
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">2. Para que servem</h2>
          <p>Só para fazer a leitura: o mapa natal, a mesa, a cruz e as respostas. Os dados não são vendidos nem usados para propaganda.</p>
        </section>
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">3. Onde ficam e quem processa</h2>
          <p>As consultas ficam no Google Firebase. O texto e a voz do Cigano são gerados pelo Google Gemini, que recebe os dados da consulta para responder. O site roda na Vercel.</p>
        </section>
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">4. Microfone</h2>
          <p>O microfone só é usado quando o dono toca no botão de falar. O áudio vira texto e não fica gravado no site.</p>
        </section>
        <section>
          <h2 className="font-serif font-bold text-[#D4AF37]">5. Seus direitos (LGPD)</h2>
          <p>O dono pode apagar consultas e conversas pelo menu ☰. Quem teve os dados usados numa consulta pode pedir ao dono para ver, corrigir ou apagar esses dados.</p>
        </section>
      </div>
      <Link to="/" className="mt-8 inline-block text-xs text-[#D4AF37] hover:underline">← Voltar para a mesa</Link>
    </div>
  </div>
);

export default PrivacyPolicy;

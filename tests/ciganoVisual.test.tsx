import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BARALHO_CIGANO } from '../src/cigano/baralho.js';
import { CartaVisual } from '../src/components/cigano/CartaVisual.js';
import { MapaNatalPainel, MesaTiragem } from '../src/components/cigano/Mesa.js';
import { promptDoCigano } from '../src/cigano/persona.js';

const sete = BARALHO_CIGANO.slice(0, 7);
const itens = [
  { grupo: 'Essência', rotulo: 'Signo solar', valor: 'Peixes', detalhe: 'Água.' },
  { grupo: 'Alma e caminho', rotulo: 'Caminho de vida', valor: '4', detalhe: 'Construção.' },
  { grupo: 'Forças espirituais', rotulo: 'Odù de nascimento', valor: 'OKÀRÁN', detalhe: 'Fala.' },
];

describe('Cartas: a arte do Tarô de Thoth, sem números por cima, com brilho', () => {
  it('a carta virada mostra a imagem do dono e nenhum número de 1 a 7 sobre a arte', () => {
    const html = renderToStaticMarkup(<CartaVisual carta={sete[2]} revelada ordem={3} />);
    expect(html).toContain(`src="${sete[2].imagem}"`);
    expect(html).toContain('cg-revelada');
    expect(html).toContain('cg-reflexo');
    // o número só existe para leitor de tela (aria-label), não como selo visível
    expect(html).not.toMatch(/rounded-full[^"]*">3<\/span>/);
    expect(html).toContain(`aria-label="Carta 3: ${sete[2].nome}"`);
  });

  it('o coringa ganha aura própria e a carta fechada mostra o verso respirando', () => {
    expect(renderToStaticMarkup(<CartaVisual carta={sete[6]} revelada coringa ordem={7} />)).toContain('cg-coringa');
    expect(renderToStaticMarkup(<CartaVisual carta={sete[0]} revelada={false} />)).toContain('cg-verso');
  });

  it('a mesa da pergunta mostra as 7 cartas em leque, com estrelas e título em ouro', () => {
    const html = renderToStaticMarkup(
      <MesaTiragem tiragem={{ id: 't', tipo: 'pergunta', criadaEm: '', pergunta: 'Ele gosta de mim?', cartas: sete }} animar={false} indicePergunta={1} />
    );
    expect((html.match(/data-testid="carta"/g) || []).length).toBe(7);
    expect(html).toContain('cg-mesa');
    expect(html).toContain('cg-estrelas');
    expect(html).toContain('cg-ouro-vivo');
    expect(html).toContain('rotate(-7deg)');
    expect(html).toContain('container-type:inline-size');
  });

  it('as animações existem e respeitam quem pede menos movimento no aparelho', () => {
    const css = readFileSync('src/index.css', 'utf8');
    for (const k of ['cg-clarao', 'cg-reflexo', 'cg-coringa', 'cg-chega', 'cg-aura', 'cg-estrela', 'cg-brilho-texto']) expect(css).toContain(`@keyframes ${k}`);
    expect(css).toContain('prefers-reduced-motion');
  });
});

describe('Retrato natal: o Cigano explica, os nomes técnicos ficam guardados', () => {
  it('mostra a explicação do Cigano e esconde números, odù e cabala atrás de "mapa técnico"', () => {
    const html = renderToStaticMarkup(
      <MapaNatalPainel nome="Ana Lucia Laurindo" nascimento="1985-02-24" hora="01:30" itens={itens}
        retrato={'Quem você é: sente tudo antes de todo mundo.\n\nComo alinhar: comece algo só seu.'} lendo={false} />
    );
    expect(html).toContain('data-testid="retrato-cigano"');
    expect(html).toContain('sente tudo antes de todo mundo');
    expect(html).toContain('Ver o mapa técnico');
    expect(html).not.toContain('OKÀRÁN');
    expect(html).not.toContain('Caminho de vida');
    expect(html).toContain('Peixes');
  });

  it('enquanto o Cigano lê, mostra que está lendo; sem retrato, oferece pedir a leitura', () => {
    expect(renderToStaticMarkup(<MapaNatalPainel nome="Ana" nascimento="1985-02-24" itens={itens} lendo />)).toContain('está lendo o mapa inteiro');
    expect(renderToStaticMarkup(<MapaNatalPainel nome="Ana" nascimento="1985-02-24" itens={itens} lendo={false} onPedirRetrato={() => undefined} />)).toContain('data-testid="pedir-retrato"');
  });

  it('a página põe o retrato dentro do painel, e não solto na conversa', () => {
    const pagina = readFileSync('src/pages/Cigano.tsx', 'utf8');
    expect(pagina).toContain("m.etapa?.tipo === 'apresentacao'");
    expect(pagina).toContain('m !== retratoMsg');
    expect(pagina).toContain('retrato={retratoMsg?.text}');
  });
});

describe('Leituras: o sentido completo, sem ficar falando o nome das cartas', () => {
  it('abertura, cruz e pergunta pedem a interpretação sem citar cartas', () => {
    const abertura = promptDoCigano({ nowMs: 0, etapa: { tipo: 'abertura' } });
    expect(abertura).toContain('NÃO diga o nome de nenhuma carta');
    expect(abertura).not.toContain('citando no máximo');
    expect(promptDoCigano({ nowMs: 0, etapa: { tipo: 'sintese_cruz' } })).toContain('NÃO diga o nome das cartas');
    expect(promptDoCigano({ nowMs: 0, etapa: { tipo: 'pergunta', indice: 1 } })).toContain('sem dizer o nome delas');
    expect(abertura).toContain('NÃO diga o nome das cartas, números, naipes nem posições');
  });

  it('o retrato natal entrega o destino, o desalinho e como alinhar, sem nomes técnicos', () => {
    const retrato = promptDoCigano({ nowMs: 0, etapa: { tipo: 'apresentacao' } });
    for (const r of ['Quem você é:', 'O que você veio viver:', 'Onde a vida desalinhou:', 'No amor:', 'Sua proteção:', 'Como alinhar:']) expect(retrato).toContain(r);
    expect(retrato).toContain('Não diga nenhum nome técnico');
    expect(retrato).toContain('RESUMO COMPLETO');
  });
});

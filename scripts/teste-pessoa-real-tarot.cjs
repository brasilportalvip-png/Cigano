#!/usr/bin/env node
/**
 * TESTE DE PESSOA REAL — Plano Especial de tarot no site publicado (computador e celular).
 * Abre o navegador visível e usa o site como uma pessoa: abre o plano, confere o texto,
 * o botão do WhatsApp com o comprovante e o "Contratar" pedindo login (sem pagar nada).
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');

const SITE = process.env.SITE_URL || 'https://maria-padilha-rainha-das-7-encruzil.vercel.app';
const resultados = [];
const passo = (aparelho, ok, texto) => { resultados.push(`${ok ? '✅ OK ' : '❌ ERRO'} [${aparelho}] ${texto}`); console.log(resultados[resultados.length - 1]); };

async function testar(nome, opcoes) {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await (await browser.newContext(opcoes)).newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  try {
    await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    // O Plano Especial fica na página inicial (rola até ele)
    const card = page.getByTestId('special-plan').first();
    await card.scrollIntoViewIfNeeded();
    await card.waitFor({ timeout: 10000 });
    passo(nome, true, 'Plano Especial aparece na página inicial');
    const texto = await card.innerText();
    passo(nome, /Magia do Tarot/.test(texto) && /Jogo com o Cigano/.test(texto), 'título e "Jogo com o Cigano"');
    passo(nome, /78 cartas/.test(texto) && /1 hora/.test(texto) && /290,00/.test(texto), '78 cartas, 1 hora e R$ 290,00');
    passo(nome, /até 3 dias/.test(texto), 'avisa: jogo em até 3 dias');
    const zap = decodeURIComponent((await card.getByTestId('special-plan-whatsapp').getAttribute('href')) || '');
    passo(nome, zap.includes('wa.me/5522998579764') && zap.includes('COMPROVANTE'), 'WhatsApp (22) 99857-9764 com comprovante na mensagem');
    await page.screenshot({ path: `teste-pessoa-real-${nome}.png`, fullPage: false });
    await card.getByTestId('special-plan-buy').click();
    await page.waitForTimeout(1500);
    const pediuLogin = /\/auth/.test(page.url());
    passo(nome, pediuLogin, '"Contratar" sem login leva para Entrar (igual aos Planos Prata, Ouro e Diamante)');
    passo(nome, erros.length === 0, `sem erro de JavaScript${erros.length ? ': ' + erros[0].slice(0, 120) : ''}`);
  } catch (e) {
    passo(nome, false, `falhou: ${String(e.message || e).slice(0, 160)}`);
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log(`\n  TESTE DE PESSOA REAL — ${SITE}\n`);
  await testar('computador', { viewport: { width: 1366, height: 860 } });
  await testar('celular', { ...devices['Pixel 5'] });
  fs.writeFileSync('relatorio-pessoa-real.txt', resultados.join('\n') + '\n', 'utf8');
  const erros = resultados.filter((r) => r.includes('ERRO')).length;
  console.log(`\n  RESULTADO: ${resultados.length - erros} OK, ${erros} com erro.\n`);
  process.exit(erros ? 1 : 0);
})();

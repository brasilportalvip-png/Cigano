#!/usr/bin/env node
/**
 * TESTE DE PESSOA REAL — Cigano (Magia das Crenças, o Reino Encantado das Cartas).
 * Abre o navegador visível no site publicado. VOCÊ entra com a sua conta de dono
 * (o teste espera até 3 minutos) e depois o robô faz uma consulta completa como você faria:
 * dados natais → mapa → abrir a mesa (ritual + 7 cartas) → cruz (5 montes) → 1 pergunta.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const SITE = (process.env.SITE_URL || process.argv[2] || '').replace(/\/$/, '');
if (!SITE) {
  console.log('\n  Use: node scripts/teste-pessoa-real-cigano.cjs https://SEU-SITE.vercel.app\n');
  process.exit(1);
}
const resultados = [];
const passo = (ok, texto) => { resultados.push(`${ok ? '✅ OK ' : '❌ ERRO'} ${texto}`); console.log(resultados[resultados.length - 1]); };

(async () => {
  console.log(`\n  TESTE DE PESSOA REAL — Cigano — ${SITE}\n`);
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', permissions: ['microphone'] })).newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  try {
    try {
      const h = await (await fetch(`${SITE}/api/health`)).json();
      passo(Boolean(h.ia && h.ia.gemini), `IA do Cigano ligada na Vercel (GEMINI_API_KEY ${h.ia && h.ia.gemini ? 'encontrada' : 'FALTANDO'})`);
      passo(Boolean(h.ia && h.ia.firebase), `Firebase ligado na Vercel (FIREBASE_SERVICE_ACCOUNT_BASE64 ${h.ia && h.ia.firebase ? 'encontrada' : 'FALTANDO'})`);
    } catch { passo(false, 'não consegui ler /api/health'); }
    await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    const entrada = await page.locator('body').innerText();
    passo(!/padilha/i.test(entrada), 'nenhuma menção a Maria Padilha na tela de entrada');
    if (/Eu sou o Cigano/.test(entrada)) passo(true, 'tela de entrada do Cigano (retrato + "Eu sou o Cigano")');
    console.log('  >>> Entre com a sua conta de dono na janela que abriu (o teste espera até 3 minutos).');
    await page.getByTestId('cigano-home').waitFor({ timeout: 180000 });
    passo(true, 'entrou: tela do Cigano aberta (estilo ChatGPT)');
    passo(!/padilha/i.test(await page.locator('body').innerText()), 'nenhuma menção a Maria Padilha na mesa');
    const rodape = (await page.getByTestId('cigano-rodape').innerText()).replace(/\s+/g, ' ');
    passo(/Termos/.test(rodape) && /Política/.test(rodape), `rodapé só com Termos e Política ("${rodape.trim()}")`);

    await page.getByTestId('cigano-nova-consulta').click();
    await page.getByTestId('form-natal-nome').fill('Teste Pessoa Real da Silva');
    await page.getByTestId('form-natal-data').fill('1990-05-10');
    await page.getByTestId('form-natal-hora').fill('14:30');
    await page.getByTestId('form-natal-ok').click();
    await page.getByTestId('mapa-natal').waitFor({ timeout: 30000 });
    const mapa = await page.getByTestId('mapa-natal').innerText();
    passo(/Signo solar/.test(mapa) && /Caminho de vida/.test(mapa) && /Anjo guardião/.test(mapa) && /Odù/.test(mapa), 'mapa natal em cima com astrologia, numerologia, cabala, odù e búzios');

    await page.getByTestId('cigano-abrir-mesa').click();
    await page.getByTestId('cigano-ritual').first().waitFor({ timeout: 30000 });
    const ritual = await page.getByTestId('cigano-ritual').first().innerText();
    passo(/Salve a magia/.test(ritual) && /Pelo poder da tradição/.test(ritual) && (ritual.match(/Quem quer saber a verdade é Teste Pessoa Real da Silva/g) || []).length === 3, 'ritual: saudação, oração e o nome três vezes');
    await page.getByTestId('mesa-abertura').waitFor({ timeout: 240000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="mesa-abertura"] [data-revelada="1"]').length === 7, null, { timeout: 30000 });
    passo(true, 'jogo de abertura: 7 cartas viradas (1-2-3, 4-5-6 e coringa)');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="cigano-resposta"]').length >= 1, null, { timeout: 240000 });
    passo(true, 'o Cigano interpretou o jogo de abertura');

    await page.getByTestId('cigano-fazer-cruz').waitFor({ timeout: 240000 });
    await page.getByTestId('cigano-fazer-cruz').click();
    await page.getByTestId('mesa-cruz').waitFor({ timeout: 240000 });
    passo((await page.locator('[data-testid^="monte-"]').count()) === 5, 'cruz: 5 montes de 7 cartas na posição da mesa');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="cigano-resposta"]').length >= 7, null, { timeout: 600000 });
    passo(true, 'o Cigano interpretou os 5 montes e fez a síntese');

    await page.getByTestId('cigano-input').fill('Vou ter sucesso no trabalho este ano?');
    await page.getByTestId('cigano-send').click();
    await page.getByTestId('mesa-pergunta').waitFor({ timeout: 240000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="cigano-resposta"]').length >= 8, null, { timeout: 300000 });
    passo(true, 'pergunta 1 de 5: 7 cartas e resposta do Cigano');
    await page.screenshot({ path: 'teste-pessoa-real-cigano.png', fullPage: false });

    const graves = erros.filter((e) => !/ResizeObserver|gtag|analytics/i.test(e));
    passo(graves.length === 0, `sem erro de JavaScript${graves.length ? ': ' + graves[0].slice(0, 140) : ''}`);
  } catch (e) {
    passo(false, `falhou: ${String(e.message || e).slice(0, 200)}`);
    await page.screenshot({ path: 'teste-pessoa-real-cigano-erro.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
  fs.writeFileSync('relatorio-pessoa-real-cigano.txt', resultados.join('\n') + '\n', 'utf8');
  const nErros = resultados.filter((r) => r.includes('ERRO')).length;
  console.log(`\n  RESULTADO: ${resultados.length - nErros} OK, ${nErros} com erro.\n`);
  process.exit(nErros ? 1 : 0);
})();

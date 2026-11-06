#!/usr/bin/env node
/**
 * TESTE DE PESSOA REAL — Cigano (Magia do Tarot, o Reino Encantado das Cartas).
 * Abre o navegador visível no site publicado. VOCÊ entra com a sua conta de dono
 * (o teste espera até 3 minutos) e depois o robô faz uma consulta completa como você faria:
 * dados natais → retrato natal → abrir a mesa (ritual + 3 montes de 7) → cruz (5 montes) → 1 pergunta pronta → copiar.
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
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', permissions: ['microphone', 'clipboard-read', 'clipboard-write'] })).newPage();
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
    // O Cigano escreve o retrato dentro do painel, em português simples.
    await page.waitForFunction(() => (document.querySelector('[data-testid="retrato-cigano"]')?.textContent || '').includes('Como alinhar'), null, { timeout: 120000 });
    const retrato = await page.getByTestId('retrato-cigano').innerText();
    passo(/Quem você é/i.test(retrato) && /O que você veio viver/i.test(retrato) && /Como alinhar/i.test(retrato), 'o Cigano apresentou o retrato: quem é, o que veio viver e como alinhar');
    passo(!/Caminho de vida|Ano pessoal|Sephirah/i.test(retrato), 'retrato sem nomes técnicos');
    // Os nomes técnicos ficam guardados para o tarólogo.
    await page.getByTestId('mapa-tecnico-botao').click();
    const mapa = await page.getByTestId('mapa-tecnico').innerText();
    passo(/Signo solar/.test(mapa) && /Caminho de vida/.test(mapa) && /Anjo guardião/.test(mapa) && /Orixás que regem/i.test(mapa) && /Ano pessoal/i.test(mapa), 'mapa técnico completo guardado: essência, alma, amor e dinheiro, orixás, momento atual e sorte');
    passo((await page.locator('[data-testid^="mapa-grupo-"]').count()) >= 6, 'mapa técnico com os 6 assuntos');
    passo(/MAGIA DO TAROT/.test(await page.locator('body').innerText()) && !/crenças/i.test(await page.locator('header').innerText()), 'nome certo: Magia do Tarot');
    await page.getByTestId('cigano-audio').click();
    passo(/desligado/i.test(await page.getByTestId('cigano-audio').innerText()), 'botão de áudio desliga');
    await page.getByTestId('cigano-audio').click();
    passo(/ligado/i.test(await page.getByTestId('cigano-audio').innerText()), 'botão de áudio liga de novo');

    await page.getByTestId('cigano-abrir-mesa').click();
    await page.getByTestId('cigano-ritual').first().waitFor({ timeout: 30000 });
    const ritual = await page.getByTestId('cigano-ritual').first().innerText();
    passo(/Salve a magia/.test(ritual) && /Pelo poder da tradição/.test(ritual) && (ritual.match(/Quem quer saber a verdade é Teste Pessoa Real da Silva/g) || []).length === 3, 'ritual: saudação, oração e o nome três vezes');
    await page.getByTestId('mesa-abertura').waitFor({ timeout: 240000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="mesa-abertura"] [data-revelada="1"]').length === 21, null, { timeout: 30000 });
    passo((await page.locator('[data-testid^="abertura-monte-"]').count()) === 3, 'jogo de abertura: 3 montes de 7 cartas viradas (1-2-3, 4-5-6 e coringa)');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="copiar-bloco"]').length >= 1, null, { timeout: 400000 });
    passo(true, 'o Cigano leu a abertura inteira (os 3 montes) numa resposta só');
    const leituraAbertura = await page.getByTestId('cigano-resposta').nth(0).innerText();
    passo(/Resumo/i.test(leituraAbertura) && /Conselho/i.test(leituraAbertura), 'abertura organizada: Resumo, os 3 montes, o que quer dizer e Conselho');
    passo(!/Discos|Princesa|Príncipe|Luxúria|Ajustamento|Aeon/.test(await page.locator('body').innerText()), 'nomes das cartas tradicionais (nada de Discos, Princesa, Luxúria…)');
    await page.getByTestId('copiar-bloco').nth(0).click();
    const copiado = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    passo(/MAGIA DO TAROT/.test(copiado) && /Teste Pessoa Real da Silva/.test(copiado) && /Cartas/.test(copiado), 'botão copiar: texto com marca, nome, cartas e a fala do Cigano');

    await page.getByTestId('cigano-fazer-cruz').waitFor({ timeout: 240000 });
    await page.getByTestId('cigano-fazer-cruz').click();
    await page.getByTestId('mesa-cruz').waitFor({ timeout: 240000 });
    passo((await page.locator('[data-testid^="monte-"]').count()) === 5, 'cruz: 5 montes de 7 cartas na posição da mesa');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="copiar-bloco"]').length >= 2, null, { timeout: 600000 });
    passo(true, 'o Cigano leu a cruz inteira (os 5 montes) numa resposta só');

    await page.getByTestId('perguntas-prontas').waitFor({ timeout: 60000 });
    passo((await page.getByTestId('pergunta-pronta').count()) >= 12, 'perguntas prontas aparecem depois da cruz');
    await page.getByTestId('pergunta-pronta').first().click();
    await page.getByTestId('mesa-pergunta').waitFor({ timeout: 240000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="copiar-bloco"]').length >= 3, null, { timeout: 300000 });
    passo(true, 'pergunta 1 de 5 (pronta): 7 cartas e resposta do Cigano');
    await page.getByTestId('copiar-consulta').click();
    const tudo = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    passo(/RETRATO NATAL/.test(tudo) && /PERGUNTA 1/.test(tudo), 'copiar consulta inteira');
    const manifesto = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).ok);
    passo(manifesto, 'aplicativo instalável (manifest no ar)');
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

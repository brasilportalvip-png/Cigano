# Magia das Crenças — o Reino Encantado das Cartas (Cigano)

Ferramenta exclusiva do Cigano (cópia do projeto Maria Padilha, com todos os oráculos).

- Tela inicial estilo ChatGPT: mapa natal em cima, mesa e conversa embaixo, voz e escuta em tempo real (mesmo sistema do Froc.IA).
- Tarot de Marselha (78 cartas), embaralhamento criptográfico a cada jogo.
- Abertura (7 cartas: 1-2-3, 4-5-6, coringa) → Cruz (5 montes de 7) → até 5 perguntas (7 cartas cada; amor/sociedade/outra pessoa comparam os dados natais).
- Oráculos: astrologia, numerologia, cabala, odù, búzios, pombagira guardiã e comparação de dados natais.
- "Minhas interpretações": o dono grava a sua leitura de cada carta e o Cigano passa a usar.
- Acesso: só o dono (admin do Firebase ou e-mail em `CIGANO_DONO_EMAILS`).

## Variáveis na Vercel
`GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_BASE64` (as mesmas do Maria Padilha) e, opcional, `CIGANO_DONO_EMAILS`.

## Testes
`npm run lint && npm test && npm run build` · teste de pessoa real: `node scripts/teste-pessoa-real-cigano.cjs https://SEU-SITE.vercel.app`

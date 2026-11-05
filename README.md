# Magia do Tarot — o Reino Encantado das Cartas (Cigano)

Ferramenta exclusiva do Cigano, com todos os oráculos.

- Tela inicial estilo ChatGPT: mapa natal em cima, mesa e conversa embaixo, voz e escuta em tempo real (mesmo sistema do Froc.IA).
- Tarot de Marselha (78 cartas), embaralhamento criptográfico a cada jogo.
- Retrato natal completo (essência, alma e caminho, amor e dinheiro, orixás e forças espirituais, momento atual, sorte) + apresentação do Cigano antes das cartas.
- Abertura (3 montes de 7: 1-2-3, 4-5-6, coringa) → Cruz (5 montes de 7) → até 5 perguntas (7 cartas cada; perguntas prontas do nicho; amor/sociedade/outra pessoa comparam os dados natais).
- Botão copiar em cada bloco e na consulta inteira (texto personalizado com nome, data e cartas, pronto para mandar).
- Áudio liga/desliga; fala dinâmica (sem pausas longas). Instalável como aplicativo (PWA).
- Oráculos: astrologia, numerologia, cabala, odù, búzios e comparação de dados natais.
- "Minhas interpretações": o dono grava a sua leitura de cada carta e o Cigano passa a usar.
- Acesso: só o dono (admin do Firebase ou e-mail em `CIGANO_DONO_EMAILS`).

## Variáveis na Vercel
`GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_BASE64` e, opcional, `CIGANO_DONO_EMAILS`.

## Testes
`npm run lint && npm test && npm run build` · teste de pessoa real: `node scripts/teste-pessoa-real-cigano.cjs https://SEU-SITE.vercel.app`

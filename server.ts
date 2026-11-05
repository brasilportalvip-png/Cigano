import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    realm: 'Magia do Tarot: O Reino Encantado das Cartas',
  });
});

// Oracle AI Reading Endpoint
app.post('/api/oracle', async (req: Request, res: Response) => {
  try {
    const { cards, spreadName, question, querentContext } = req.body;

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Nenhuma carta fornecida para o oráculo.' });
    }

    // If Gemini client is not initialized or API key is absent, use high-wisdom fallback generator
    if (!ai) {
      const fallbackReading = generateFallbackWisdom(cards, spreadName, question);
      return res.json({ reading: fallbackReading, isFallback: true });
    }

    const cardsDescription = cards
      .map(
        (c: any, idx: number) =>
          `${idx + 1}. [Posição: ${c.position || 'Geral'}] ${c.name} (${c.upright ? 'Na Luz / Direta' : 'Na Sombra / Invertida'})\nPalavras-chave: ${c.keywords || ''}\nSignificado Essencial: ${c.upright ? c.uprightMeaning || c.meaning : c.reversedMeaning || c.meaning}`
      )
      .join('\n\n');

    const prompt = `Você é o Oráculo Místico do Reino Encantado do Tarot.
Uma alma consulente procurou a sabedoria sagrada das cartas.

DETALHES DA TIRAGEM:
- Tipo de Tiragem: ${spreadName || 'Tiragem Livre'}
- Pergunta / Intenção da Alma: ${question ? `"${question}"` : 'Busca por iluminação e clareza no caminho atual'}
${querentContext ? `- Contexto Adicional: "${querentContext}"` : ''}

CARTAS REVELADAS:
${cardsDescription}

INSTRUÇÕES DO ORÁCULO:
Escreva uma leitura transcendental, lúcida, acolhedora e profundamente enriquecedora em Português (Brasil).
Estruture sua revelação com as seguintes seções bem delineadas (use formatação limpa em Markdown):

### 🌟 O Portal das Energias: Visão Geral
(Uma síntese poética e clarificadora do momento presente e da vibração central que rege esta tiragem).

### 🔮 Revelações das Cartas & Posições
(Analise cada carta em sua respectiva posição sagrada, tecendo como elas dialogam entre si e como as posições invertidas/sombras trazem aprendizados e libertações).

### 🌿 Alquimia dos Elementos
(Identifique a presença ou ausência dos elementos — Fogo/Paus, Água/Copas, Ar/Espadas, Terra/Ouros, ou Éter/Arcanos Maiores — e o que esse equilíbrio elemental indica).

### ✨ Conselho do Oráculo & Caminho Prático
(Um conselho prático, ético, maduro e inspirador para guiar a ação no mundo físico).

### 🌙 Afirmação Sagrada
(Uma afirmação de poder curta, positiva e ancoradora em 1-2 frases).

### 🕯️ Pergunta para o seu Grimório
(Uma reflexão profunda para o consulente meditar ou escrever em seu diário místico).

Tom: Místico, respeitoso, empático, poético e fortalecedor.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Você é o Oráculo do Reino Encantado do Tarot. Conduza interpretações arquetípicas profundas e éticas, combinando a rica tradição do Tarot (Waite, simbolismo esotérico) com psicologia arquetípica acolhedora. Responda em Português com elegância e clareza.',
      },
    });

    const readingText = response.text || generateFallbackWisdom(cards, spreadName, question);
    return res.json({ reading: readingText, isFallback: false });
  } catch (error: any) {
    console.error('Error contacting Gemini Oracle:', error);
    // Provide serene graceful fallback rather than breaking user experience
    const { cards, spreadName, question } = req.body || {};
    const fallback = generateFallbackWisdom(cards || [], spreadName, question);
    return res.json({ reading: fallback, isFallback: true, warning: 'Mensagem transmitida pelos arquivos ancestrais do Reino.' });
  }
});

// Fallback high-fidelity interpretation engine
function generateFallbackWisdom(cards: any[], spreadName: string = 'Tiragem Sagrada', question?: string): string {
  const cardNames = cards.map((c) => `${c.name} (${c.upright ? 'Direta' : 'Invertida'})`).join(', ');
  const firstCard = cards[0] || { name: 'O Louco', upright: true };
  const lastCard = cards[cards.length - 1] || firstCard;

  return `### 🌟 O Portal das Energias: Visão Geral
As estrelas do Reino Encantado abriram seus portais para a sua jornada. Esta tiragem (${spreadName}) traz a manifestação arquetípica de **${cardNames}**. ${
    question ? `Em resposta à sua busca sobre *"${question}"*, o` : 'O'
  } cosmo sinaliza um momento de alinhamento entre a sua intenção consciente e as correntes silenciosas do destino.

### 🔮 Revelações das Cartas & Posições
${cards
  .map(
    (c, i) => `**${i + 1}. ${c.position || `Passo ${i + 1}`}: ${c.name} (${c.upright ? 'Luz / Direta' : 'Sombra / Invertida'})**
${c.upright ? c.uprightMeaning || 'Expressão pura das virtudes do arcano, trazendo expansão, clareza e bênçãos cósmicas.' : c.reversedMeaning || 'Convite à introspecção e liberação de bloqueios internos que impediam o fluxo natural desta energia.'}`
  )
  .join('\n\n')}

### 🌿 Alquimia dos Elementos
A dança entre **${firstCard.name}** e **${lastCard.name}** indica que a transmutação está em curso. Há um chamado direto para equilibrar a razão e a intuição: permita que o fogo da sua vontade se harmonize com a água da sua sensibilidade.

### ✨ Conselho do Oráculo & Caminho Prático
Não hesite diante das escolhas que exigem autenticidade. O Reino das Cartas lembra que todo arcano é um espelho de sua sabedoria interior; tome decisões amparadas pela calma, honre o seu tempo sagrado e dê o próximo passo com determinação serena.

### 🌙 Afirmação Sagrada
*"Eu me abro para as revelações do universo; acolho as lições do passado, vivo com sabedoria o presente e construo um futuro luminoso."*

### 🕯️ Pergunta para o seu Grimório
*Qual verdade profunda em meu coração eu já conheço, mas ainda hesito em abraçar plenamente?*`;
}

// Development with Vite vs Production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Magia do Tarot] Reino Encantado ativo na porta ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

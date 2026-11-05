/**
 * As perguntas que fazem a pessoa procurar um cartomante (prontas para tocar e tirar as cartas).
 * `outra`: a pergunta pode envolver outra pessoa (o site oferece comparar os dados natais).
 */
export interface PerguntaPronta { texto: string; tema: 'ano' | 'forcas' | 'caminhos' | 'amor' | 'alerta' | 'futuro'; outra?: boolean }

export const PERGUNTAS_PRONTAS: PerguntaPronta[] = [
  { texto: 'O que posso esperar deste ano?', tema: 'ano' },
  { texto: 'Quais forças estão presentes na minha vida e com qual orixá posso contar?', tema: 'forcas' },
  { texto: 'Meus caminhos estão abertos para conquistas e realizações?', tema: 'caminhos' },
  { texto: 'O que posso esperar das minhas novas metas?', tema: 'caminhos' },
  { texto: 'Qual conselho o Cigano me dá?', tema: 'caminhos' },
  { texto: 'Corro algum risco, perigo ou demanda?', tema: 'alerta' },
  { texto: 'Minhas energias estão boas?', tema: 'alerta' },
  { texto: 'Estou tendo perturbação? Do que se trata?', tema: 'alerta' },
  { texto: 'O que posso esperar para amanhã?', tema: 'futuro' },
  { texto: 'O que está por vir?', tema: 'futuro' },
  { texto: 'Como está minha vida amorosa?', tema: 'amor' },
  { texto: 'Existe um novo amor ou uma reconciliação chegando?', tema: 'amor', outra: true },
];

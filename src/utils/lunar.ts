export interface MoonPhaseInfo {
  phaseName: string;
  emoji: string;
  illumination: number; // percentage
  tarotAdvice: string;
  recommendedSpreads: string[];
}

export function getCurrentMoonPhase(): MoonPhaseInfo {
  const now = new Date();
  // Known new moon reference date: Jan 11, 2024, 11:57 UTC
  const refDate = new Date(Date.UTC(2024, 0, 11, 11, 57));
  const synodicMonth = 29.53058867; // days
  const diffDays = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);
  const cycleDay = (diffDays % synodicMonth + synodicMonth) % synodicMonth;
  const illumination = Math.round(((1 - Math.cos((cycleDay / synodicMonth) * 2 * Math.PI)) / 2) * 100);

  if (cycleDay < 1.84) {
    return {
      phaseName: 'Lua Nova',
      emoji: '🌑',
      illumination,
      tarotAdvice: 'Momento de plantar intenções místicas e iniciar novos caminhos. As cartas acolhem sonhos e projetos embrionários.',
      recommendedSpreads: ['carta-do-dia', 'triade-do-tempo'],
    };
  } else if (cycleDay < 7.38) {
    return {
      phaseName: 'Lua Crescente',
      emoji: '🌒',
      illumination,
      tarotAdvice: 'Energia de magnetismo e expansão. Excelente momento para tiragens sobre decisões práticas, carreira e amor.',
      recommendedSpreads: ['escolha-dos-caminhos', 'alquimia-do-amor'],
    };
  } else if (cycleDay < 9.22) {
    return {
      phaseName: 'Quarto Crescente',
      emoji: '🌓',
      illumination,
      tarotAdvice: 'Força de superação e foco. Momento ideal para identificar obstáculos e firmar compromissos.',
      recommendedSpreads: ['triade-do-tempo', 'escolha-dos-caminhos'],
    };
  } else if (cycleDay < 14.76) {
    return {
      phaseName: 'Gibosa Crescente',
      emoji: '🌔',
      illumination,
      tarotAdvice: 'Aperfeiçoamento e maturação. O véu entre os mundos torna-se mais fino; ouça os detalhes sutis das cartas.',
      recommendedSpreads: ['alquimia-do-amor', 'cruz-celta'],
    };
  } else if (cycleDay < 16.61) {
    return {
      phaseName: 'Lua Cheia',
      emoji: '🌕',
      illumination,
      tarotAdvice: 'Clareza máxima e ápice intuitivo! As cartas revelam verdades ocultas e bênçãos cósmicas com poder incomparável.',
      recommendedSpreads: ['cruz-celta', 'carta-do-dia'],
    };
  } else if (cycleDay < 22.15) {
    return {
      phaseName: 'Gibosa Minguante',
      emoji: '🌖',
      illumination,
      tarotAdvice: 'Gratidão e colheita de sabedoria. Ótimo momento para registrar insights profundos em seu Grimório.',
      recommendedSpreads: ['triade-do-tempo', 'cruz-celta'],
    };
  } else if (cycleDay < 23.99) {
    return {
      phaseName: 'Quarto Minguante',
      emoji: '🌗',
      illumination,
      tarotAdvice: 'Libertação e desapego. Pergunte às cartas o que deve ser deixado para trás para renovar suas energias.',
      recommendedSpreads: ['escolha-dos-caminhos', 'carta-do-dia'],
    };
  } else {
    return {
      phaseName: 'Lua Balsâmica',
      emoji: '🌘',
      illumination,
      tarotAdvice: 'Descanso da alma, cura e introspecção silenciosa. Prepare o solo espiritual para o próximo ciclo.',
      recommendedSpreads: ['carta-do-dia', 'triade-do-tempo'],
    };
  }
}

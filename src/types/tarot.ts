export type ElementType = 'fogo' | 'água' | 'ar' | 'terra' | 'éter';
export type CardSuit = 'major' | 'paus' | 'copas' | 'espadas' | 'ouros';

export interface TarotCard {
  id: string;
  name: string;
  englishName: string;
  suit: CardSuit;
  number: number;
  romanNumeral?: string;
  element: ElementType;
  astrology: string;
  keywords: string[];
  reversedKeywords: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  mythosAndLore: string;
  affirmation: string;
  advice: string;
  colorScheme: {
    primary: string;
    secondary: string;
    border: string;
    glow: string;
  };
}

export interface SpreadPosition {
  index: number;
  title: string;
  description: string;
  x?: number; // relative placement in layout
  y?: number;
}

export interface TarotSpread {
  id: string;
  name: string;
  category: 'iniciação' | 'amor' | 'decisão' | 'profundo' | 'diário';
  cardCount: number;
  tagline: string;
  description: string;
  positions: SpreadPosition[];
  difficulty: 'Iniciante' | 'Intermediário' | 'Mestre';
}

export interface DrawnCard {
  card: TarotCard;
  isUpright: boolean;
  position: SpreadPosition;
  revealed: boolean;
}

export interface SavedReading {
  id: string;
  timestamp: string;
  spreadId: string;
  spreadName: string;
  question: string;
  notes?: string;
  cards: {
    id: string;
    name: string;
    isUpright: boolean;
    positionTitle: string;
  }[];
  oracleInterpretation?: string;
}

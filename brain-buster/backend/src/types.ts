export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
}

export interface GameConfig {
  timePerQuestion: number;
  categoryFilter: string | null;
  difficultyFilter: 'easy' | 'medium' | 'hard' | null;
}

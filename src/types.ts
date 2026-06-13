export interface Level {
  id: number;
  name: string;
  stage: 1 | 2;
  riddle: string;
  hint: string;
  tip?: string;
  acceptedAnswers?: string[];
  taskUrl?: string;
  // level-specific static structures
  sequence?: string;
}

export interface GameState {
  currentLevelIndex: number; // 0 to 7
  revealedHints: { [levelIndex: number]: boolean };
  hintsRemaining: number;
  completedLevels: { [levelIndex: number]: boolean };
  score: number;
  gameCompleted: boolean;
}

export interface KeyBindings {
  moveLeft: string;
  moveRight: string;
  jump: string;
  attack: string;
  special: string;
}

export type ScreenState = 'START' | 'OPTIONS' | 'GAME';

export interface GameSettings {
  soundVolume: number;
  enableVibration: boolean;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
}

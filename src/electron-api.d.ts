import type { Game, Genre, GameInput } from './shared/types';

type AppUser = {
  id: number;
  username: string;
  role: 'admin' | 'user';
};

type ElectronAPI = {
  login: (username: string, password: string) => Promise<AppUser>;
  register: (username: string, password: string) => Promise<AppUser>;

  getGames: (userId?: number) => Promise<Game[]>;
  getGame: (id: number, userId?: number) => Promise<Game | null>;
  uploadGameIconFromPC: (scope: 'admin' | 'user', userId?: number) => Promise<string | null>;
  setUserGameIcon: (userId: number, gameId: number, iconPath: string | null) => Promise<{ success: true }>;
  getGenres: () => Promise<Genre[]>;
  launchGame: (gameId: number, userId: number) => Promise<number>;

  rateGame: (userId: number, gameId: number, rating: 1 | 2 | 3 | 4 | 5) => Promise<{ success: true }>;
  getUserRating: (userId: number, gameId: number) => Promise<1 | 2 | 3 | 4 | 5 | null>;

  addGame: (gameData: GameInput, adminUserId: number) => Promise<Game>;
  updateGame: (id: number, updates: GameInput, adminUserId: number) => Promise<{ success: true }>;
  deleteGame: (id: number, adminUserId: number) => Promise<{ success: true }>;
  addGenre: (genreData: { name: string; description: string }, adminUserId: number) => Promise<Genre>;
  deleteGenre: (id: number, adminUserId: number) => Promise<{ success: true }>;
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
import type { Game, Genre, GameInput, GameUpdateInput } from './shared/types';

type AppUser = {
  id: number;
  username: string;
  role: 'admin' | 'user';
  displayName: string | null;
  email: string | null;
  phone: string | null;
  iconPath: string | null;
};

type ProfileUpdateInput = {
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  iconPath?: string | null;
};

type ElectronAPI = {
  login: (username: string, password: string) => Promise<AppUser>;
  register: (username: string, password: string) => Promise<AppUser>;
  logout: () => Promise<{ success: true }>;
  setLanguage: (language: 'ru' | 'en') => Promise<void>;
  getProfile: () => Promise<AppUser>;
  uploadProfileIconFromPC: () => Promise<string | null>;
  updateProfile: (profileData: ProfileUpdateInput) => Promise<AppUser>;

  getGames: () => Promise<Game[]>;
  getGame: (id: number) => Promise<Game | null>;
  uploadGameIconFromPC: (scope: 'admin' | 'user') => Promise<string | null>;
  setUserGameIcon: (gameId: number, iconPath: string | null) => Promise<{ success: true }>;
  getGenres: () => Promise<Genre[]>;
  launchGame: (gameId: number) => Promise<number>;

  rateGame: (gameId: number, rating: 1 | 2 | 3 | 4 | 5) => Promise<{ success: true }>;
  getUserRating: (gameId: number) => Promise<1 | 2 | 3 | 4 | 5 | null>;

  addGame: (gameData: GameInput) => Promise<Game>;
  updateGame: (id: number, updates: GameUpdateInput) => Promise<{ success: true }>;
  deleteGame: (id: number) => Promise<{ success: true }>;
  addGenre: (genreData: { name: string; description: string }) => Promise<Genre>;
  updateGenre: (id: number, genreData: { name: string; description: string }) => Promise<Genre>;
  deleteGenre: (id: number) => Promise<{ success: true }>;
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
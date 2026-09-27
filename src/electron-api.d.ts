import type { Game, GameReview, Genre, GameInput, GameUpdateInput, UserReview } from './shared/types';

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
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: true }>;
  setLanguage: (language: 'ru' | 'en') => Promise<void>;
  getProfile: () => Promise<AppUser>;
  uploadProfileIconFromPC: () => Promise<string | null>;
  updateProfile: (profileData: ProfileUpdateInput) => Promise<AppUser>;

  getGames: () => Promise<Game[]>;
  getGame: (id: number) => Promise<Game | null>;
  uploadGameIconFromPC: (scope: 'admin' | 'user') => Promise<string | null>;
  setUserGameIcon: (gameId: number, iconPath: string | null) => Promise<{ success: true }>;
  pickExecutable: () => Promise<{ filePath: string; iconPath: string | null } | null>;
  getGenres: () => Promise<Genre[]>;
  launchGame: (gameId: number) => Promise<number>;
  toggleFavorite: (gameId: number) => Promise<{ favorite: boolean }>;

  rateGame: (gameId: number, rating: 1 | 2 | 3 | 4 | 5, comment: string | null) => Promise<{ success: true }>;
  getUserRating: (gameId: number) => Promise<1 | 2 | 3 | 4 | 5 | null>;
  getRatingDistribution: (gameId: number) => Promise<Record<1 | 2 | 3 | 4 | 5, number>>;
  getGameReviews: (gameId: number) => Promise<GameReview[]>;
  getUserReview: (gameId: number) => Promise<UserReview | null>;

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
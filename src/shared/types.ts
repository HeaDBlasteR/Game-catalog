export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
}

export interface Genre {
  id: number;
  name: string;
  description: string;
}

export interface Game {
  id: number;
  title: string;
  description: string | null;
  genres: Genre[];
  releaseDate: string;
  developer: string;
  averageRating: number;
  totalRatings: number;
  filePath: string;
  iconPath: string | null;
}

export interface GameInput {
  title: string;
  description: string;
  genreIds: number[];
  releaseDate: string;
  developer: string;
  filePath: string;
  iconPath?: string | null;
}

export interface GameUpdateInput extends Partial<Omit<GameInput, 'genreIds'>> {
  genreIds?: number[];
}

export interface UserRating {
  id: number;
  userId: number;
  gameId: number;
  rating: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}
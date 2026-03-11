export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
}

export type GameGenre = 'Action packed' | 'Adventures' | 'Strategies' | 'Role-playing games' | 'Races' | 'Simulators';

export interface Game {
  id: number;
  title: string;
  description: string | null;
  genre: GameGenre;
  releaseDate: string;
  developer: string;
  averageRating: number;
  totalRatings: number;
  filePath: string;
}

export interface UserRating {
  id: number;
  userId: number;
  gameId: number;
  rating: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}
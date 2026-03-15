import { DataSource } from 'typeorm';
import { User } from '../src/entities/User';
import { Game } from '../src/entities/Game';
import { UserRating } from '../src/entities/UserRating';
import { Genre } from '../src/entities/Genre';
import path from 'path';
import { app } from 'electron';

const dbPath = process.env.NODE_ENV === 'development'
  ? path.join(process.cwd(), 'data.db')
  : path.join(app.getPath('userData'), 'data.db');

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: dbPath,
  entities: [User, Game, UserRating, Genre],
  synchronize: true,
  logging: false,
});
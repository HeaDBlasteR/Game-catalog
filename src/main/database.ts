import { app } from 'electron';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Game, User, UserRating, GameGenre, UserRole } from '../shared/types';

const dbPath = process.env.NODE_ENV === 'development'
  ? path.join(__dirname, '../../data.db')
  : path.join(app.getPath('userData'), 'data.db');

export async function getDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

export async function initDatabase() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'user')) NOT NULL DEFAULT 'user'
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      genre TEXT CHECK(genre IN ('Action packed', 'Adventures', 'Strategies', 'Role-playing games', 'Races', 'Simulators')) NOT NULL,
      releaseDate TEXT NOT NULL,
      developer TEXT NOT NULL,
      averageRating REAL DEFAULT 0,
      totalRatings INTEGER DEFAULT 0,
      filePath TEXT NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      gameId INTEGER NOT NULL,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE,
      UNIQUE(userId, gameId)
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ratings_game ON user_ratings(gameId);
    CREATE INDEX IF NOT EXISTS idx_ratings_user ON user_ratings(userId);
  `);

  const adminExists = await db.get('SELECT * FROM users WHERE role = ?', 'admin');
  if (!adminExists) {
    const bcrypt = require('bcrypt');
    const hashedPassword = bcrypt.hashSync('admin', 10);
    await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      'admin', hashedPassword, 'admin'
    );
  }
}

export const userDb = {
  findByUsername: async (username: string): Promise<User | undefined> => {
    const db = await getDb();
    return db.get('SELECT * FROM users WHERE username = ?', username);
  },
  create: async (username: string, password: string, role: UserRole = 'user'): Promise<User> => {
    const db = await getDb();
    const bcrypt = require('bcrypt');
    const hashed = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      username, hashed, role
    );
    return { id: result.lastID!, username, password: hashed, role };
  }
};

export const gameDb = {
  getAll: async (): Promise<Game[]> => {
    const db = await getDb();
    return db.all('SELECT * FROM games ORDER BY title');
  },
  getById: async (id: number): Promise<Game | undefined> => {
    const db = await getDb();
    return db.get('SELECT * FROM games WHERE id = ?', id);
  },
  create: async (game: Omit<Game, 'id' | 'averageRating' | 'totalRatings'>): Promise<Game> => {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO games (title, description, genre, releaseDate, developer, filePath, averageRating, totalRatings)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
      game.title, game.description, game.genre, game.releaseDate, game.developer, game.filePath
    );
    return { ...game, id: result.lastID!, averageRating: 0, totalRatings: 0 };
  },
  update: async (id: number, updates: Partial<Game>): Promise<void> => {
    const db = await getDb();
    const { title, description, genre, releaseDate, developer, filePath } = updates;
    await db.run(
      `UPDATE games
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           genre = COALESCE(?, genre),
           releaseDate = COALESCE(?, releaseDate),
           developer = COALESCE(?, developer),
           filePath = COALESCE(?, filePath)
       WHERE id = ?`,
      title, description, genre, releaseDate, developer, filePath, id
    );
  },
  delete: async (id: number): Promise<void> => {
    const db = await getDb();
    await db.run('DELETE FROM games WHERE id = ?', id);
  }
};

export const ratingDb = {
  getUserRating: async (userId: number, gameId: number): Promise<UserRating | undefined> => {
    const db = await getDb();
    return db.get('SELECT * FROM user_ratings WHERE userId = ? AND gameId = ?', userId, gameId);
  },
  addOrUpdateRating: async (userId: number, gameId: number, rating: 1|2|3|4|5): Promise<void> => {
    const db = await getDb();
    await db.run(
      `INSERT OR REPLACE INTO user_ratings (userId, gameId, rating, createdAt)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      userId, gameId, rating
    );
    await updateGameAverageRating(gameId);
  },
  deleteRating: async (userId: number, gameId: number): Promise<void> => {
    const db = await getDb();
    await db.run('DELETE FROM user_ratings WHERE userId = ? AND gameId = ?', userId, gameId);
    await updateGameAverageRating(gameId);
  }
};

async function updateGameAverageRating(gameId: number) {
  const db = await getDb();
  const stats = await db.get(
    'SELECT AVG(rating) as avgRating, COUNT(*) as total FROM user_ratings WHERE gameId = ?',
    gameId
  ) as { avgRating: number | null; total: number };
  const avg = stats.avgRating || 0;
  await db.run(
    'UPDATE games SET averageRating = ?, totalRatings = ? WHERE id = ?',
    avg, stats.total, gameId
  );
}
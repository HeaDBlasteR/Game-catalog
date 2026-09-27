import { AppDataSource } from './data-source';
import { In } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { User } from '../src/entities/User';
import { Game } from '../src/entities/Game';
import { UserRating } from '../src/entities/UserRating';
import { Genre } from '../src/entities/Genre';
import { UserGameIcon } from '../src/entities/UserGameIcon';
import { UserGameState } from '../src/entities/UserGameState';
import type { Game as GameDto, GameReview, Genre as GenreDto } from '../src/shared/types';
import { UserRole } from '../src/shared/types';
import { appError } from '../src/shared/app-error';

const ICON_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_ICON_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon'
]);

const ICON_EXTENSION_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

type CreateGameInput = {
  title: string;
  description?: string | null;
  releaseDate: string;
  developer: string;
  filePath: string;
  iconPath?: string | null;
  genreIds: number[];
};

type UpdateGameInput = Partial<Omit<CreateGameInput, 'genreIds'>> & {
  genreIds?: number[];
};

export const userDb = {
  findByUsername: async (username: string): Promise<User | null> => {
    const repo = AppDataSource.getRepository(User);
    return repo.findOneBy({ username });
  },
  create: async (username: string, password: string, role: UserRole = 'user'): Promise<User> => {
    const repo = AppDataSource.getRepository(User);
    const user = new User();
    user.username = username;
    await user.setPassword(password);
    user.role = role;
    return repo.save(user);
  }
};

export const gameDb = {
  getAll: async (userId?: number): Promise<GameDto[]> => {
    const repo = AppDataSource.getRepository(Game);
    const games = await repo.find({
      order: { title: 'ASC' },
      relations: ['genres']
    });

    return applyUserData(games, userId);
  },
  getById: async (id: number, userId?: number): Promise<GameDto | null> => {
    const repo = AppDataSource.getRepository(Game);
    const game = await repo.findOne({
      where: { id },
      relations: ['genres']
    });

    if (!game) return null;
    const [withUserData] = await applyUserData([game], userId);
    return withUserData;
  },
  toggleFavorite: async (userId: number, gameId: number): Promise<boolean> => {
    const repo = AppDataSource.getRepository(UserGameState);
    const state = await repo.findOneBy({ userId, gameId });

    if (state) {
      state.favorite = !state.favorite;
      await repo.save(state);
      return state.favorite;
    }

    await repo.save(repo.create({ userId, gameId, favorite: true }));
    return true;
  },
  registerPlaySession: async (userId: number, gameId: number, playedSeconds: number): Promise<void> => {
    const repo = AppDataSource.getRepository(UserGameState);
    const state = await repo.findOneBy({ userId, gameId })
      ?? repo.create({ userId, gameId, favorite: false, playtimeSeconds: 0, launchCount: 0 });

    state.playtimeSeconds += Math.max(0, Math.round(playedSeconds));
    state.launchCount += 1;
    state.lastPlayedAt = new Date();
    await repo.save(state);
  },
  create: async (gameData: CreateGameInput): Promise<Game> => {
    const gameRepo = AppDataSource.getRepository(Game);
    const genreRepo = AppDataSource.getRepository(Genre);

    const genres = await genreRepo.findBy({ id: In(gameData.genreIds || []) });
    if (!genres.length) {
      throw appError('genreRequired');
    }

    const normalizedIconPath = await validateIconPath(gameData.iconPath);

    const game = gameRepo.create({
      title: gameData.title,
      description: gameData.description ?? null,
      releaseDate: gameData.releaseDate,
      developer: gameData.developer,
      filePath: gameData.filePath,
      iconPath: normalizedIconPath,
      genres
    });

    return gameRepo.save(game);
  },
  update: async (id: number, updates: UpdateGameInput): Promise<void> => {
    const gameRepo = AppDataSource.getRepository(Game);
    const genreRepo = AppDataSource.getRepository(Genre);

    const game = await gameRepo.findOne({ where: { id }, relations: ['genres'] });
    if (!game) throw appError('gameNotFound');

    if (typeof updates.title === 'string') game.title = updates.title;
    if (updates.description !== undefined) game.description = updates.description;
    if (typeof updates.releaseDate === 'string') game.releaseDate = updates.releaseDate;
    if (typeof updates.developer === 'string') game.developer = updates.developer;
    if (typeof updates.filePath === 'string') game.filePath = updates.filePath;
    if (updates.iconPath !== undefined) {
      game.iconPath = await validateIconPath(updates.iconPath);
    }

    if (updates.genreIds !== undefined) {
      const genres = await genreRepo.findBy({ id: In(updates.genreIds) });
      if (!genres.length) {
        throw appError('genreRequired');
      }
      game.genres = genres;
    }

    await gameRepo.save(game);
  },
  delete: async (id: number): Promise<void> => {
    const gameRepo = AppDataSource.getRepository(Game);
    await gameRepo.delete(id);
  },
  setUserIcon: async (userId: number, gameId: number, iconPath: string | null): Promise<void> => {
    const repo = AppDataSource.getRepository(UserGameIcon);

    if (!iconPath) {
      await repo.delete({ userId, gameId });
      return;
    }

    const normalizedIconPath = await validateIconPath(iconPath);
    if (!normalizedIconPath) {
      await repo.delete({ userId, gameId });
      return;
    }

    await repo.save({
      userId,
      gameId,
      iconPath: normalizedIconPath
    });
  },
  uploadIconFromLocalFile: async (sourceFilePath: string, scope: 'admin' | 'user', userId?: number): Promise<string> => {
    const extension = path.extname(sourceFilePath).toLowerCase();
    const mimeType = ICON_EXTENSION_TO_MIME[extension];
    if (!mimeType) {
      throw appError('iconUnsupportedType');
    }

    if (scope === 'user' && !userId) {
      throw appError('invalidInput');
    }

    const buffer = await fs.promises.readFile(sourceFilePath);
    if (buffer.length > ICON_UPLOAD_MAX_BYTES) {
      throw appError('iconTooLarge');
    }

    return buildIconDataUrl(buffer, mimeType);
  }
};

export const genreDb = {
  getAll: async (): Promise<GenreDto[]> => {
    const genres = await AppDataSource.getRepository(Genre)
      .createQueryBuilder('genre')
      .loadRelationCountAndMap('genre.gamesCount', 'genre.games')
      .orderBy('genre.name', 'ASC')
      .getMany();

    return genres.map(toGenreDto);
  },
  create: async (name: string, description: string = ''): Promise<GenreDto> => {
    const repo = AppDataSource.getRepository(Genre);
    const normalizedName = name.trim();
    if (!normalizedName) throw appError('genreNameRequired');

    const exists = await repo.findOneBy({ name: normalizedName });
    if (exists) throw appError('genreNameTaken');

    const genre = repo.create({
      name: normalizedName,
      description: description.trim()
    });
    return toGenreDto(await repo.save(genre));
  },
  update: async (id: number, name: string, description: string = ''): Promise<GenreDto> => {
    const repo = AppDataSource.getRepository(Genre);
    const genre = await repo.findOneBy({ id });
    if (!genre) throw appError('genreNotFound');

    const normalizedName = name.trim();
    if (!normalizedName) throw appError('genreNameRequired');

    const exists = await repo.findOneBy({ name: normalizedName });
    if (exists && exists.id !== id) throw appError('genreNameTaken');

    genre.name = normalizedName;
    genre.description = description.trim();

    return toGenreDto(await repo.save(genre));
  },
  delete: async (id: number): Promise<void> => {
    await AppDataSource.transaction(async manager => {
      const genreRepo = manager.getRepository(Genre);
      const genre = await genreRepo.findOne({ where: { id }, relations: ['games'] });
      if (!genre) throw appError('genreNotFound');

      if (genre.games.length) {
        await manager
          .createQueryBuilder()
          .relation(Genre, 'games')
          .of(id)
          .remove(genre.games.map(game => game.id));
      }

      await genreRepo.delete(id);
    });
  }
};

export const ratingDb = {
  getUserRating: async (userId: number, gameId: number): Promise<UserRating | null> => {
    const repo = AppDataSource.getRepository(UserRating);
    return repo.findOne({
      where: { user: { id: userId }, game: { id: gameId } },
      relations: ['user', 'game']
    });
  },
  getDistribution: async (gameId: number): Promise<Record<1|2|3|4|5, number>> => {
    const repo = AppDataSource.getRepository(UserRating);
    const rows = await repo
      .createQueryBuilder('rating')
      .select('rating.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('rating.gameId = :gameId', { gameId })
      .groupBy('rating.rating')
      .getRawMany();

    const distribution: Record<1|2|3|4|5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of rows) {
      const value = Number(row.rating) as 1|2|3|4|5;
      if (value >= 1 && value <= 5) distribution[value] = Number(row.count) || 0;
    }
    return distribution;
  },
  getReviews: async (gameId: number): Promise<GameReview[]> => {
    const repo = AppDataSource.getRepository(UserRating);
    const ratings = await repo.find({
      where: { game: { id: gameId } },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });

    return ratings.map(item => ({
      id: item.id,
      author: item.user.displayName?.trim() || item.user.username,
      rating: item.rating,
      comment: item.comment,
      createdAt: toIsoString(item.createdAt)
    }));
  },
  addOrUpdateRating: async (userId: number, gameId: number, rating: 1|2|3|4|5, comment: string | null = null): Promise<void> => {
    const ratingRepo = AppDataSource.getRepository(UserRating);
    const gameRepo = AppDataSource.getRepository(Game);

    let userRating = await ratingRepo.findOne({
      where: { user: { id: userId }, game: { id: gameId } }
    });

    if (userRating) {
      userRating.rating = rating;
      userRating.comment = comment;
    } else {
      userRating = ratingRepo.create({
        user: { id: userId },
        game: { id: gameId },
        rating,
        comment
      });
    }
    await ratingRepo.save(userRating);

    await updateGameAverageRating(gameId);
  },
  deleteRating: async (userId: number, gameId: number): Promise<void> => {
    const ratingRepo = AppDataSource.getRepository(UserRating);
    await ratingRepo.delete({ user: { id: userId }, game: { id: gameId } });
    await updateGameAverageRating(gameId);
  }
};

async function updateGameAverageRating(gameId: number) {
  const ratingRepo = AppDataSource.getRepository(UserRating);
  const gameRepo = AppDataSource.getRepository(Game);

  const result = await ratingRepo
    .createQueryBuilder('rating')
    .select('AVG(rating.rating)', 'avg')
    .addSelect('COUNT(*)', 'total')
    .where('rating.gameId = :gameId', { gameId })
    .getRawOne();

  const avg = result.avg ? parseFloat(result.avg) : 0;
  const total = parseInt(result.total, 10) || 0;

  await gameRepo.update(gameId, {
    averageRating: avg,
    totalRatings: total
  });
}

function sanitizeIconPath(iconPath?: string | null): string | null {
  if (iconPath === undefined || iconPath === null) return null;
  const trimmed = iconPath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  return trimmed || null;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toGenreDto(genre: Genre): GenreDto {
  return {
    id: genre.id,
    name: genre.name,
    description: genre.description,
    gamesCount: genre.gamesCount ?? 0
  };
}

function toGameDto(game: Game): GameDto {
  return {
    id: game.id,
    title: game.title,
    description: game.description,
    genres: (game.genres ?? []).map(toGenreDto),
    releaseDate: game.releaseDate,
    developer: game.developer,
    averageRating: game.averageRating,
    totalRatings: game.totalRatings,
    filePath: game.filePath,
    iconPath: game.iconPath,
    createdAt: toIsoString(game.createdAt),
    favorite: false,
    playtimeSeconds: 0,
    launchCount: 0,
    lastPlayedAt: null
  };
}

async function applyUserData(games: Game[], userId?: number): Promise<GameDto[]> {
  const result = games.map(toGameDto);
  if (!userId || !result.length) {
    return result;
  }

  const gameIds = result.map(game => game.id);
  const [overrides, states] = await Promise.all([
    AppDataSource.getRepository(UserGameIcon).find({ where: { userId, gameId: In(gameIds) } }),
    AppDataSource.getRepository(UserGameState).find({ where: { userId, gameId: In(gameIds) } })
  ]);

  const overrideMap = new Map(overrides.map(override => [override.gameId, override.iconPath]));
  const stateMap = new Map(states.map(state => [state.gameId, state]));

  return result.map(game => {
    const overridePath = overrideMap.get(game.id);
    const state = stateMap.get(game.id);

    return {
      ...game,
      iconPath: overridePath ?? game.iconPath,
      favorite: state?.favorite ?? false,
      playtimeSeconds: state?.playtimeSeconds ?? 0,
      launchCount: state?.launchCount ?? 0,
      lastPlayedAt: toIsoString(state?.lastPlayedAt ?? null)
    };
  });
}

async function validateIconPath(iconPath?: string | null): Promise<string | null> {
  const normalized = sanitizeIconPath(iconPath);
  if (!normalized) return null;

  if (normalized.startsWith('data:')) {
    return validateDataUrlIcon(normalized);
  }

  throw appError('iconInvalidFormat');
}

function validateDataUrlIcon(iconDataUrl: string): string {
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(iconDataUrl);
  if (!match) {
    throw appError('iconInvalidFormat');
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_ICON_MIME_TYPES.has(mimeType)) {
    throw appError('iconUnsupportedType');
  }

  const binary = Buffer.from(match[2], 'base64');
  if (!binary.length) {
    throw appError('iconEmpty');
  }

  if (binary.length > ICON_UPLOAD_MAX_BYTES) {
    throw appError('iconTooLarge');
  }

  return `data:${mimeType};base64,${binary.toString('base64')}`;
}

function buildIconDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

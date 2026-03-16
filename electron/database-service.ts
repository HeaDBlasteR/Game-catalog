import { AppDataSource } from './data-source';
import { In } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { User } from '../src/entities/User';
import { Game } from '../src/entities/Game';
import { UserRating } from '../src/entities/UserRating';
import { Genre } from '../src/entities/Genre';
import { UserGameIcon } from '../src/entities/UserGameIcon';
import { UserRole } from '../src/shared/types';

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
  getAll: async (userId?: number): Promise<Game[]> => {
    const repo = AppDataSource.getRepository(Game);
    const games = await repo.find({
      order: { title: 'ASC' },
      relations: ['genres']
    });

    return applyUserIconOverrides(games, userId);
  },
  getById: async (id: number, userId?: number): Promise<Game | null> => {
    const repo = AppDataSource.getRepository(Game);
    const game = await repo.findOne({
      where: { id },
      relations: ['genres']
    });

    if (!game) return null;
    const [withIcon] = await applyUserIconOverrides([game], userId);
    return withIcon;
  },
  create: async (gameData: CreateGameInput): Promise<Game> => {
    const gameRepo = AppDataSource.getRepository(Game);
    const genreRepo = AppDataSource.getRepository(Genre);

    const genres = await genreRepo.findBy({ id: In(gameData.genreIds || []) });
    if (!genres.length) {
      throw new Error('Выберите хотя бы один жанр');
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
    if (!game) throw new Error('Игра не найдена');

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
        throw new Error('Выберите хотя бы один жанр');
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
      throw new Error('Неподдерживаемый формат иконки');
    }

    if (scope === 'user' && !userId) {
      throw new Error('Для пользовательской иконки требуется userId');
    }

    const buffer = await fs.promises.readFile(sourceFilePath);
    if (buffer.length > ICON_UPLOAD_MAX_BYTES) {
      throw new Error('Иконка слишком большая. Максимальный размер: 5 МБ');
    }

    return buildIconDataUrl(buffer, mimeType);
  }
};

export const genreDb = {
  getAll: async (): Promise<Genre[]> => {
    const repo = AppDataSource.getRepository(Genre);
    return repo.find({ order: { name: 'ASC' } });
  },
  create: async (name: string, description: string = ''): Promise<Genre> => {
    const repo = AppDataSource.getRepository(Genre);
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error('Название жанра обязательно');

    const exists = await repo.findOneBy({ name: normalizedName });
    if (exists) throw new Error('Жанр с таким названием уже существует');

    const genre = repo.create({
      name: normalizedName,
      description: description.trim()
    });
    return repo.save(genre);
  },
  delete: async (id: number): Promise<void> => {
    await AppDataSource.transaction(async manager => {
      const genreRepo = manager.getRepository(Genre);
      const genre = await genreRepo.findOne({ where: { id }, relations: ['games'] });
      if (!genre) throw new Error('Жанр не найден');

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
  addOrUpdateRating: async (userId: number, gameId: number, rating: 1|2|3|4|5): Promise<void> => {
    const ratingRepo = AppDataSource.getRepository(UserRating);
    const gameRepo = AppDataSource.getRepository(Game);

    let userRating = await ratingRepo.findOne({
      where: { user: { id: userId }, game: { id: gameId } }
    });

    if (userRating) {
      userRating.rating = rating;
    } else {
      userRating = ratingRepo.create({
        user: { id: userId },
        game: { id: gameId },
        rating
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

async function applyUserIconOverrides(games: Game[], userId?: number): Promise<Game[]> {
  if (!userId || !games.length) {
    return games;
  }

  const iconRepo = AppDataSource.getRepository(UserGameIcon);
  const overrides = await iconRepo.find({
    where: { userId, gameId: In(games.map(game => game.id)) }
  });

  const overrideMap = new Map<number, string>();
  for (const override of overrides) {
    overrideMap.set(override.gameId, override.iconPath);
  }

  return games.map(game => {
    const overridePath = overrideMap.get(game.id);
    if (!overridePath) return game;
    game.iconPath = overridePath;
    return game;
  });
}

async function validateIconPath(iconPath?: string | null): Promise<string | null> {
  const normalized = sanitizeIconPath(iconPath);
  if (!normalized) return null;

  if (normalized.startsWith('data:')) {
    return validateDataUrlIcon(normalized);
  }

  if (normalized.startsWith('icons/')) {
    const migrated = await convertLegacyIconPathToDataUrl(normalized);
    if (!migrated) {
      throw new Error('Иконка не найдена для миграции в базу данных');
    }
    return migrated;
  }

  throw new Error('Некорректный формат иконки');
}

function validateDataUrlIcon(iconDataUrl: string): string {
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(iconDataUrl);
  if (!match) {
    throw new Error('Некорректный формат data URL для иконки');
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_ICON_MIME_TYPES.has(mimeType)) {
    throw new Error('Неподдерживаемый MIME-тип иконки');
  }

  const binary = Buffer.from(match[2], 'base64');
  if (!binary.length) {
    throw new Error('Иконка не содержит данных');
  }

  if (binary.length > ICON_UPLOAD_MAX_BYTES) {
    throw new Error('Иконка слишком большая. Максимальный размер: 5 МБ');
  }

  return `data:${mimeType};base64,${binary.toString('base64')}`;
}

function buildIconDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function convertLegacyIconPathToDataUrl(iconPath: string): Promise<string | null> {
  const absolutePath = resolveLegacyIconAbsolutePath(iconPath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return null;
  }

  const extension = path.extname(absolutePath).toLowerCase();
  const mimeType = ICON_EXTENSION_TO_MIME[extension];
  if (!mimeType) {
    return null;
  }

  const buffer = await fs.promises.readFile(absolutePath);
  if (!buffer.length || buffer.length > ICON_UPLOAD_MAX_BYTES) {
    return null;
  }

  return buildIconDataUrl(buffer, mimeType);
}

function resolveLegacyIconAbsolutePath(iconPath: string): string | null {
  const normalized = sanitizeIconPath(iconPath);
  if (!normalized || !normalized.startsWith('icons/')) {
    return null;
  }

  const relative = normalized.slice('icons/'.length);
  for (const root of getLegacyIconRoots()) {
    const candidate = path.join(root, relative);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getLegacyIconRoots(): string[] {
  const roots = [
    path.join(process.cwd(), 'public', 'icons'),
    path.join(process.cwd(), 'dist', 'icons'),
    path.join(__dirname, '../../dist/icons')
  ];

  return Array.from(new Set(roots.map(root => path.normalize(root))));
}

export async function migrateLegacyIconsToDatabase(): Promise<void> {
  const gameRepo = AppDataSource.getRepository(Game);
  const userIconRepo = AppDataSource.getRepository(UserGameIcon);

  const gamesWithLegacyIcons = await gameRepo
    .createQueryBuilder('game')
    .where("game.iconPath LIKE 'icons/%'")
    .getMany();

  for (const game of gamesWithLegacyIcons) {
    if (!game.iconPath) {
      continue;
    }

    const migrated = await convertLegacyIconPathToDataUrl(game.iconPath);
    if (!migrated) {
      game.iconPath = null;
      await gameRepo.save(game);
      continue;
    }
    game.iconPath = migrated;
    await gameRepo.save(game);
  }

  const userOverridesWithLegacyIcons = await userIconRepo
    .createQueryBuilder('icon')
    .where("icon.iconPath LIKE 'icons/%'")
    .getMany();

  for (const override of userOverridesWithLegacyIcons) {
    const migrated = await convertLegacyIconPathToDataUrl(override.iconPath);
    if (!migrated) {
      await userIconRepo.delete({ userId: override.userId, gameId: override.gameId });
      continue;
    }
    override.iconPath = migrated;
    await userIconRepo.save(override);
  }
}
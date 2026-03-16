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

    const previousIconPath = game.iconPath;

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

    if (previousIconPath && previousIconPath !== game.iconPath) {
      await removeIconIfUnused(previousIconPath);
    }
  },
  delete: async (id: number): Promise<void> => {
    const gameRepo = AppDataSource.getRepository(Game);
    const userIconRepo = AppDataSource.getRepository(UserGameIcon);

    const game = await gameRepo.findOneBy({ id });
    const userOverrides = await userIconRepo.findBy({ gameId: id });

    const iconCandidates = new Set<string>();
    if (game?.iconPath) iconCandidates.add(game.iconPath);
    for (const override of userOverrides) {
      iconCandidates.add(override.iconPath);
    }

    await gameRepo.delete(id);

    for (const iconPath of iconCandidates) {
      await removeIconIfUnused(iconPath);
    }
  },
  setUserIcon: async (userId: number, gameId: number, iconPath: string | null): Promise<void> => {
    const repo = AppDataSource.getRepository(UserGameIcon);
    const existing = await repo.findOneBy({ userId, gameId });

    if (!iconPath) {
      await repo.delete({ userId, gameId });
      if (existing?.iconPath) {
        await removeIconIfUnused(existing.iconPath);
      }
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

    if (existing?.iconPath && existing.iconPath !== normalizedIconPath) {
      await removeIconIfUnused(existing.iconPath);
    }
  },
  uploadIconFromLocalFile: async (sourceFilePath: string, scope: 'admin' | 'user', userId?: number): Promise<string> => {
    const extension = path.extname(sourceFilePath).toLowerCase();
    if (!/\.(png|jpg|jpeg|webp|svg|ico)$/.test(extension)) {
      throw new Error('Неподдерживаемый формат иконки');
    }

    if (scope === 'user' && !userId) {
      throw new Error('Для пользовательской иконки требуется userId');
    }

    const relativeSubDir = scope === 'admin' ? 'admin' : `users/${userId}`;
    const baseName = path.basename(sourceFilePath, extension).replace(/[^a-zA-Z0-9_-]/g, '-');
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName || 'icon'}${extension}`;
    const roots = getWritableIconRoots();

    for (const root of roots) {
      const targetDir = path.join(root, relativeSubDir);
      await fs.promises.mkdir(targetDir, { recursive: true });
      const destinationPath = path.join(targetDir, uniqueName);
      await fs.promises.copyFile(sourceFilePath, destinationPath);
    }

    return scope === 'admin'
      ? `icons/admin/${uniqueName}`
      : `icons/users/${userId}/${uniqueName}`;
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

function listAvailableIconPaths(): string[] {
  const roots = getReadableIconRoots();
  const unique = new Set<string>();

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const iconPath of collectIconPathsRecursive(root, root)) {
      unique.add(iconPath);
    }
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
}

function resolveIconsDirectory(): string | null {
  const candidates = [
    path.join(process.cwd(), 'public', 'icons'),
    path.join(process.cwd(), 'dist', 'icons'),
    path.join(__dirname, '../../dist/icons')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

async function validateIconPath(iconPath?: string | null): Promise<string | null> {
  const normalized = sanitizeIconPath(iconPath);
  if (!normalized) return null;

  if (!/^icons\/(admin\/[a-zA-Z0-9._-]+|users\/\d+\/[a-zA-Z0-9._-]+)$/.test(normalized)) {
    throw new Error('Некорректный путь иконки');
  }

  const availableIcons = await listAvailableIconPaths();
  if (!availableIcons.includes(normalized)) {
    throw new Error('Иконка не найдена в public/icons');
  }

  return normalized;
}

function ensureIconsDirectory(): string {
  const iconsDir = getPrimaryIconsRoot();
  fs.mkdirSync(iconsDir, { recursive: true });
  return iconsDir;
}

function ensureAdminIconsDirectory(): string {
  const dir = path.join(ensureIconsDirectory(), 'admin');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureUserIconsDirectory(userId: number): string {
  const dir = path.join(ensureIconsDirectory(), 'users', String(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function collectIconPathsRecursive(rootDir: string, currentDir: string): string[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectIconPathsRecursive(rootDir, fullPath));
      continue;
    }

    if (!entry.isFile() || !/\.(png|jpg|jpeg|webp|svg|ico)$/i.test(entry.name)) {
      continue;
    }

    const relative = path.relative(rootDir, fullPath).replace(/\\/g, '/');
    result.push(`icons/${relative}`);
  }

  return result;
}

function resolveIconAbsolutePath(iconPath: string): string | null {
  const normalized = sanitizeIconPath(iconPath);
  if (!normalized || !normalized.startsWith('icons/')) {
    return null;
  }

  const relative = normalized.slice('icons/'.length);
  const roots = getReadableIconRoots();

  for (const root of roots) {
    const candidate = path.join(root, relative);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(getPrimaryIconsRoot(), relative);
}

async function removeIconIfUnused(iconPath: string): Promise<void> {
  const normalized = sanitizeIconPath(iconPath);
  if (!normalized) return;

  const gameRepo = AppDataSource.getRepository(Game);
  const userIconRepo = AppDataSource.getRepository(UserGameIcon);

  const [baseCount, overrideCount] = await Promise.all([
    gameRepo.countBy({ iconPath: normalized }),
    userIconRepo.countBy({ iconPath: normalized })
  ]);

  if (baseCount > 0 || overrideCount > 0) {
    return;
  }

  const absolutePath = resolveIconAbsolutePath(normalized);
  if (!absolutePath) {
    return;
  }

  const relative = normalized.slice('icons/'.length);
  for (const root of getReadableIconRoots()) {
    const candidate = path.join(root, relative);
    if (!fs.existsSync(candidate)) continue;

    try {
      fs.unlinkSync(candidate);
    } catch {
    }
  }
}

function getPrimaryIconsRoot(): string {
  return path.join(process.cwd(), 'public', 'icons');
}

function getReadableIconRoots(): string[] {
  const roots = [
    getPrimaryIconsRoot(),
    path.join(process.cwd(), 'dist', 'icons'),
    path.join(__dirname, '../../dist/icons')
  ];

  return Array.from(new Set(roots.map(root => path.normalize(root))));
}

function getWritableIconRoots(): string[] {
  const roots = [getPrimaryIconsRoot()];
  const mirrors = [
    path.join(process.cwd(), 'dist', 'icons'),
    path.join(__dirname, '../../dist/icons')
  ];

  for (const mirror of mirrors) {
    if (fs.existsSync(path.dirname(mirror)) || fs.existsSync(mirror)) {
      roots.push(mirror);
    }
  }

  return Array.from(new Set(roots.map(root => path.normalize(root))));
}
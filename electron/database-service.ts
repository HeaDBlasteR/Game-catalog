import { AppDataSource } from './data-source';
import { In } from 'typeorm';
import { User } from '../src/entities/User';
import { Game } from '../src/entities/Game';
import { UserRating } from '../src/entities/UserRating';
import { Genre } from '../src/entities/Genre';
import { UserRole } from '../src/shared/types';

type CreateGameInput = {
  title: string;
  description?: string | null;
  releaseDate: string;
  developer: string;
  filePath: string;
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
  getAll: async (): Promise<Game[]> => {
    const repo = AppDataSource.getRepository(Game);
    return repo.find({
      order: { title: 'ASC' },
      relations: ['genres']
    });
  },
  getById: async (id: number): Promise<Game | null> => {
    const repo = AppDataSource.getRepository(Game);
    return repo.findOne({
      where: { id },
      relations: ['genres']
    });
  },
  create: async (gameData: CreateGameInput): Promise<Game> => {
    const gameRepo = AppDataSource.getRepository(Game);
    const genreRepo = AppDataSource.getRepository(Genre);

    const genres = await genreRepo.findBy({ id: In(gameData.genreIds || []) });
    if (!genres.length) {
      throw new Error('Выберите хотя бы один жанр');
    }

    const game = gameRepo.create({
      title: gameData.title,
      description: gameData.description ?? null,
      releaseDate: gameData.releaseDate,
      developer: gameData.developer,
      filePath: gameData.filePath,
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
    const repo = AppDataSource.getRepository(Game);
    await repo.delete(id);
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
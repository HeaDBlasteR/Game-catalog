import { AppDataSource } from './data-source';
import { User } from '../src/entities/User';
import { Game } from '../src/entities/Game';
import { UserRating } from '../src/entities/UserRating';
import { UserRole, Game as GameType, UserRating as RatingType } from '../src/shared/types';

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
    return repo.find({ order: { title: 'ASC' } });
  },
  getById: async (id: number): Promise<Game | null> => {
    const repo = AppDataSource.getRepository(Game);
    return repo.findOneBy({ id });
  },
  create: async (gameData: Omit<GameType, 'id' | 'averageRating' | 'totalRatings'>): Promise<Game> => {
    const repo = AppDataSource.getRepository(Game);
    const game = repo.create(gameData);
    return repo.save(game);
  },
  update: async (id: number, updates: Partial<GameType>): Promise<void> => {
    const repo = AppDataSource.getRepository(Game);
    await repo.update(id, updates);
  },
  delete: async (id: number): Promise<void> => {
    const repo = AppDataSource.getRepository(Game);
    await repo.delete(id);
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
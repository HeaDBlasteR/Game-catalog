import { AppDataSource } from '../data-source';
import { Genre } from '../../src/entities/Genre';
import { DEFAULT_GENRES } from '../../src/shared/default-genres';

export class DefaultGenreService {
  static async ensureDefaultGenres(): Promise<void> {
    const genreRepo = AppDataSource.getRepository(Genre);
    const existingGenres = await genreRepo.find();
    const existingNames = new Set(existingGenres.map(genre => genre.name.toLowerCase()));

    const missingGenres = DEFAULT_GENRES.filter(genre => !existingNames.has(genre.name.toLowerCase()));
    if (!missingGenres.length) {
      return;
    }

    await genreRepo.save(missingGenres.map(genre => genreRepo.create({
      name: genre.name,
      description: genre.description.ru
    })));
  }
}

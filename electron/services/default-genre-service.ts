import { AppDataSource } from '../data-source';
import { Genre } from '../../src/entities/Genre';

type DefaultGenre = {
  name: string;
  description: string;
};

export class DefaultGenreService {
  private static readonly GENRES: DefaultGenre[] = [
    { name: 'Action packed', description: 'Динамичные игры с быстрым темпом и боями.' },
    { name: 'Adventures', description: 'Сюжетные приключения с исследованием мира.' },
    { name: 'Strategies', description: 'Игры, где важны планирование и тактика.' },
    { name: 'Role-playing games', description: 'Ролевые игры с прокачкой персонажей.' },
    { name: 'Races', description: 'Гоночные игры на скорость и контроль.' },
    { name: 'Simulators', description: 'Симуляторы процессов и профессий.' },
    { name: 'Survival horror', description: 'Выживание в пугающей атмосфере с ограниченными ресурсами.' },
    { name: 'Shooter', description: 'Игры, построенные вокруг стрельбы и боевых столкновений.' },
    { name: 'Stealth', description: 'Скрытное прохождение и избежание прямых столкновений.' },
    { name: 'Platformer', description: 'Прыжки, тайминг и перемещение по уровням с препятствиями.' },
    { name: 'Puzzle', description: 'Игры, где ключевая механика - решение задач и головоломок.' },
    { name: 'Roguelike', description: 'Процедурная генерация, высокая сложность и перманентная смерть.' },
    { name: 'Metroidvania', description: 'Исследование связного мира с постепенным открытием новых зон.' },
    { name: 'Sandbox', description: 'Свобода действий и создание собственных игровых сценариев.' },
    { name: 'MOBA', description: 'Командные матчи с ролями, линиями и развитием персонажей.' },
    { name: 'Battle royale', description: 'Массовые матчи на выживание до последнего игрока или отряда.' },
    { name: 'Sports', description: 'Игры на тему классических и киберспортивных дисциплин.' },
    { name: 'Fighting', description: 'Дуэли с комбо, реакцией и контролем дистанции.' },
    { name: 'MMORPG', description: 'Массовые онлайн-ролевые игры с прогрессией и кооперацией.' },
    { name: 'Tower defense', description: 'Оборона точек и маршрутов при помощи построек и юнитов.' },
    { name: 'Rhythm', description: 'Игры, завязанные на ритм, темп и точность нажатий.' }
  ];

  static async ensureDefaultGenres(): Promise<void> {
    const genreRepo = AppDataSource.getRepository(Genre);
    const existingGenres = await genreRepo.find();
    const existingNames = new Set(existingGenres.map(genre => genre.name.toLowerCase()));

    const missingGenres = this.GENRES.filter(genre => !existingNames.has(genre.name.toLowerCase()));
    if (!missingGenres.length) {
      return;
    }

    await genreRepo.save(missingGenres.map(genre => genreRepo.create(genre)));
  }
}

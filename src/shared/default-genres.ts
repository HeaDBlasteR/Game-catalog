export type DefaultGenre = {
  name: string;
  description: { ru: string; en: string };
};

export const DEFAULT_GENRES: DefaultGenre[] = [
  { name: 'Action packed', description: { ru: 'Динамичные игры с быстрым темпом и боями.', en: 'Dynamic, fast-paced games full of combat.' } },
  { name: 'Adventures', description: { ru: 'Сюжетные приключения с исследованием мира.', en: 'Story-driven adventures with world exploration.' } },
  { name: 'Strategies', description: { ru: 'Игры, где важны планирование и тактика.', en: 'Games where planning and tactics matter.' } },
  { name: 'Role-playing games', description: { ru: 'Ролевые игры с прокачкой персонажей.', en: 'Role-playing games with character progression.' } },
  { name: 'Races', description: { ru: 'Гоночные игры на скорость и контроль.', en: 'Racing games about speed and control.' } },
  { name: 'Simulators', description: { ru: 'Симуляторы процессов и профессий.', en: 'Simulations of processes and professions.' } },
  { name: 'Survival horror', description: { ru: 'Выживание в пугающей атмосфере с ограниченными ресурсами.', en: 'Survival in a frightening atmosphere with limited resources.' } },
  { name: 'Shooter', description: { ru: 'Игры, построенные вокруг стрельбы и боевых столкновений.', en: 'Games built around shooting and combat encounters.' } },
  { name: 'Stealth', description: { ru: 'Скрытное прохождение и избежание прямых столкновений.', en: 'Sneaking through levels and avoiding direct confrontation.' } },
  { name: 'Platformer', description: { ru: 'Прыжки, тайминг и перемещение по уровням с препятствиями.', en: 'Jumping, timing and moving through levels full of obstacles.' } },
  { name: 'Puzzle', description: { ru: 'Игры, где ключевая механика - решение задач и головоломок.', en: 'Games where the core mechanic is solving puzzles.' } },
  { name: 'Roguelike', description: { ru: 'Процедурная генерация, высокая сложность и перманентная смерть.', en: 'Procedural generation, high difficulty and permanent death.' } },
  { name: 'Metroidvania', description: { ru: 'Исследование связного мира с постепенным открытием новых зон.', en: 'Exploring an interconnected world and gradually unlocking new areas.' } },
  { name: 'Sandbox', description: { ru: 'Свобода действий и создание собственных игровых сценариев.', en: 'Freedom of action and creating your own gameplay scenarios.' } },
  { name: 'MOBA', description: { ru: 'Командные матчи с ролями, линиями и развитием персонажей.', en: 'Team matches with roles, lanes and character growth.' } },
  { name: 'Battle royale', description: { ru: 'Массовые матчи на выживание до последнего игрока или отряда.', en: 'Large-scale survival matches until the last player or squad stands.' } },
  { name: 'Sports', description: { ru: 'Игры на тему классических и киберспортивных дисциплин.', en: 'Games based on traditional sports and esports.' } },
  { name: 'Fighting', description: { ru: 'Дуэли с комбо, реакцией и контролем дистанции.', en: 'Duels built on combos, reactions and spacing.' } },
  { name: 'MMORPG', description: { ru: 'Массовые онлайн-ролевые игры с прогрессией и кооперацией.', en: 'Massively multiplayer online RPGs with progression and co-op.' } },
  { name: 'Tower defense', description: { ru: 'Оборона точек и маршрутов при помощи построек и юнитов.', en: 'Defending points and paths with buildings and units.' } },
  { name: 'Rhythm', description: { ru: 'Игры, завязанные на ритм, темп и точность нажатий.', en: 'Games built around rhythm, tempo and precise input.' } }
];

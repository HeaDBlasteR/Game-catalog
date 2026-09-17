import { ipcMain } from 'electron';
import { gameDb, genreDb } from '../database-service';
import { assertId, assertString, requireAdmin } from '../session';

type GenreInput = { name: string; description?: string };

type GameInput = {
  title: string;
  developer: string;
  releaseDate: string;
  filePath: string;
  description?: string | null;
  iconPath?: string | null;
  genreIds: number[];
};

function validateGenreInput(input: GenreInput) {
  if (!input || typeof input !== 'object') throw new Error('Некорректные данные жанра');
  const name = assertString(input.name, 'Название жанра');
  const description = input.description === undefined ? '' : assertString(input.description, 'Описание');
  return { name, description };
}

function validateGameInput(input: any, partial: true): Partial<GameInput>;
function validateGameInput(input: any, partial: false): GameInput;
function validateGameInput(input: any, partial: boolean): Partial<GameInput> {
  if (!input || typeof input !== 'object') throw new Error('Некорректные данные игры');

  const result: Partial<GameInput> = {};
  const requiredText = ['title', 'developer', 'releaseDate', 'filePath'] as const;

  for (const field of requiredText) {
    if (input[field] === undefined && partial) continue;
    const value = assertString(input[field], field).trim();
    if (!value) throw new Error('Заполните все обязательные поля');
    result[field] = value;
  }

  if (input.description !== undefined) {
    result.description = input.description === null ? null : assertString(input.description, 'description');
  }

  if (input.iconPath !== undefined) {
    result.iconPath = input.iconPath === null ? null : assertString(input.iconPath, 'iconPath');
  }

  if (input.genreIds !== undefined || !partial) {
    if (!Array.isArray(input.genreIds)) throw new Error('Выберите хотя бы один жанр');
    result.genreIds = input.genreIds.map(assertId);
  }

  return result;
}

export function registerAdminHandlers() {
  ipcMain.handle('admin:addGame', async (event, gameData) => {
    try {
      await requireAdmin(event);
      return await gameDb.create(validateGameInput(gameData, false));
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('admin:updateGame', async (event, id: number, updates) => {
    try {
      await requireAdmin(event);
      await gameDb.update(assertId(id), validateGameInput(updates, true));
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('admin:deleteGame', async (event, id: number) => {
    try {
      await requireAdmin(event);
      await gameDb.delete(assertId(id));
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('admin:addGenre', async (event, genreData: GenreInput) => {
    try {
      await requireAdmin(event);
      const { name, description } = validateGenreInput(genreData);
      return await genreDb.create(name, description);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('admin:updateGenre', async (event, id: number, genreData: GenreInput) => {
    try {
      await requireAdmin(event);
      const { name, description } = validateGenreInput(genreData);
      return await genreDb.update(assertId(id), name, description);
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle('admin:deleteGenre', async (event, id: number) => {
    try {
      await requireAdmin(event);
      await genreDb.delete(assertId(id));
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message);
    }
  });
}

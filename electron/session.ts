import type { IpcMainInvokeEvent } from 'electron';
import { AppDataSource } from './data-source';
import { User } from '../src/entities/User';
import { appError } from '../src/shared/app-error';

const sessions = new Map<number, number>();

export function setSessionUser(event: IpcMainInvokeEvent, userId: number) {
  sessions.set(event.sender.id, userId);
}

export function clearSession(webContentsId: number) {
  sessions.delete(webContentsId);
}

export function getSessionUserId(event: IpcMainInvokeEvent): number | undefined {
  return sessions.get(event.sender.id);
}

export async function requireUser(event: IpcMainInvokeEvent): Promise<User> {
  const userId = sessions.get(event.sender.id);
  if (!userId) throw appError('authRequired');

  const user = await AppDataSource.getRepository(User).findOneBy({ id: userId });
  if (!user) {
    sessions.delete(event.sender.id);
    throw appError('authRequired');
  }

  return user;
}

export async function requireAdmin(event: IpcMainInvokeEvent): Promise<User> {
  const user = await requireUser(event);
  if (user.role !== 'admin') throw appError('forbidden');
  return user;
}

export function assertId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw appError('invalidId');
  }
  return value;
}

export function assertString(value: unknown): string {
  if (typeof value !== 'string') throw appError('invalidInput');
  return value;
}

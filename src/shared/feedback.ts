export type NoticeType = 'success' | 'error' | 'info';

export type NoticeState = {
  type: NoticeType;
  text: string;
};

const DEFAULT_ERROR_MESSAGE = 'Не удалось выполнить операцию. Попробуйте еще раз.';

export function toUserErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  const raw = extractErrorMessage(error).toLowerCase();

  if (!raw) {
    return fallback;
  }

  if (raw.includes('неверн') && raw.includes('парол')) {
    return 'Неверное имя пользователя или пароль.';
  }

  if (raw.includes('already exists') || raw.includes('уже существует')) {
    return 'Пользователь с таким именем уже существует.';
  }

  if (raw.includes('доступ запрещен') || raw.includes('forbidden') || raw.includes('unauthorized')) {
    return 'У вас нет прав для выполнения этого действия.';
  }

  if (raw.includes('not found') || raw.includes('не найден')) {
    return 'Запрошенные данные не найдены.';
  }

  if (
    raw.includes('validation') ||
    raw.includes('invalid') ||
    raw.includes('constraint') ||
    raw.includes('sqlite_constraint')
  ) {
    return 'Проверьте введенные данные и повторите попытку.';
  }

  if (
    raw.includes('network') ||
    raw.includes('timeout') ||
    raw.includes('econnrefused') ||
    raw.includes('enotfound')
  ) {
    return 'Проблема с подключением. Проверьте соединение и повторите попытку.';
  }

  return fallback;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === 'string') {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    return typeof value === 'string' ? value : '';
  }

  return '';
}
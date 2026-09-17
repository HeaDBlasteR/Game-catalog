export type NoticeType = 'success' | 'error' | 'info';

export type NoticeState = {
  type: NoticeType;
  text: string;
};

const DEFAULT_ERROR_MESSAGE = 'Не удалось выполнить операцию. Попробуйте еще раз.';

export function toUserErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  const message = stripIpcPrefix(extractErrorMessage(error)).trim();
  const raw = message.toLowerCase();

  if (!raw) {
    return fallback;
  }

  if (/[а-яё]/i.test(message)) {
    return /[.!?]$/.test(message) ? message : `${message}.`;
  }

  if (raw.includes('already exists')) {
    return 'Пользователь с таким именем уже существует.';
  }

  if (raw.includes('not found')) {
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

  return fallback;
}

function stripIpcPrefix(message: string): string {
  return message.replace(/^Error invoking remote method '[^']*':\s*(?:\w*Error:\s*)?/, '');
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
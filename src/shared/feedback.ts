import { parseAppErrorCode } from './app-error';
import type { TranslationKey } from '../i18n/translations';

export type NoticeType = 'success' | 'error' | 'info';

export type NoticeState = {
  type: NoticeType;
  text: string;
};

export function toUserErrorMessage(
  error: unknown,
  fallback: TranslationKey,
  t: (key: TranslationKey) => string
): string {
  const message = stripIpcPrefix(extractErrorMessage(error)).trim();
  const raw = message.toLowerCase();

  if (!raw) {
    return t(fallback);
  }

  const code = parseAppErrorCode(message);
  if (code) {
    return t(`errors.${code}`);
  }

  if (raw.includes('not found')) {
    return t('common.notFound');
  }

  if (
    raw.includes('validation') ||
    raw.includes('invalid') ||
    raw.includes('constraint') ||
    raw.includes('sqlite_constraint')
  ) {
    return t('common.checkInput');
  }

  return t(fallback);
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

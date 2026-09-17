export type AppErrorCode =
  | 'authRequired'
  | 'forbidden'
  | 'invalidId'
  | 'invalidInput'
  | 'invalidCredentials'
  | 'usernameRequired'
  | 'usernameTooLong'
  | 'passwordRequired'
  | 'passwordTooLong'
  | 'usernameTaken'
  | 'iconInvalidFormat'
  | 'iconUnsupportedType'
  | 'iconEmpty'
  | 'iconTooLarge'
  | 'gameNotFound'
  | 'gameFileNotFound'
  | 'adminCannotRate'
  | 'ratingOutOfRange'
  | 'requiredFields'
  | 'genreRequired'
  | 'genreNameRequired'
  | 'genreNameTaken'
  | 'genreNotFound';

const PREFIX = 'APP_ERROR:';

export function appError(code: AppErrorCode): Error {
  return new Error(`${PREFIX}${code}`);
}

export function parseAppErrorCode(message: string): AppErrorCode | null {
  const match = /APP_ERROR:(\w+)/.exec(message);
  return match ? (match[1] as AppErrorCode) : null;
}

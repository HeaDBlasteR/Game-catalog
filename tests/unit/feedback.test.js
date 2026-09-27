const test = require('node:test');
const assert = require('node:assert/strict');

const { toUserErrorMessage } = require('../../dist-electron/src/shared/feedback');
const { appError, parseAppErrorCode } = require('../../dist-electron/src/shared/app-error');

const t = key => `[${key}]`;
const message = (error, fallback = 'common.genericError') => toUserErrorMessage(error, fallback, t);

test('translates an application error code', () => {
  assert.equal(message(appError('gameNotFound')), '[errors.gameNotFound]');
  assert.equal(message(appError('forbidden')), '[errors.forbidden]');
});

test('unwraps the Electron IPC wrapper around the code', () => {
  const ipcError = new Error("Error invoking remote method 'games:launch': Error: APP_ERROR:gameFileNotFound");
  assert.equal(message(ipcError), '[errors.gameFileNotFound]');
});

test('falls back for an empty or unknown error', () => {
  assert.equal(message(new Error('')), '[common.genericError]');
  assert.equal(message(null), '[common.genericError]');
  assert.equal(message(undefined, 'catalog.loadFailed'), '[catalog.loadFailed]');
  assert.equal(message(new Error('something exploded'), 'catalog.loadFailed'), '[catalog.loadFailed]');
});

test('recognizes database and validation wording', () => {
  assert.equal(message(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed')), '[common.checkInput]');
  assert.equal(message(new Error('Invalid value')), '[common.checkInput]');
  assert.equal(message(new Error('Entity not found')), '[common.notFound]');
});

test('accepts plain strings and error-like objects', () => {
  assert.equal(message('APP_ERROR:genreNameTaken'), '[errors.genreNameTaken]');
  assert.equal(message({ message: 'APP_ERROR:usernameTaken' }), '[errors.usernameTaken]');
  assert.equal(message({ message: 42 }), '[common.genericError]');
});

test('error codes survive a round trip', () => {
  assert.equal(parseAppErrorCode(appError('ratingOutOfRange').message), 'ratingOutOfRange');
  assert.equal(parseAppErrorCode('no code here'), null);
  assert.equal(parseAppErrorCode(''), null);
});

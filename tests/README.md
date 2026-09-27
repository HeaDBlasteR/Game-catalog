# Tests

Two layers, both run by `npm test`:

- **Unit tests** (`tests/unit`) check pure logic through Node's built-in test runner. They import the
  compiled output from `dist-electron`, so the project has to be built first.
- **End-to-end suites** (`tests/*.test.js`) drive the packaged app through Playwright's Electron
  support: every suite launches the real Electron binary, clicks through the UI and checks what the
  user sees.

```bash
npm run build
npm test
```

Each end-to-end run uses a throwaway `--user-data-dir`, so the tests never touch your own `data.db`.
Screenshots of failures are written to `tests/.artifacts/shots`.

| Suite | What it covers |
| --- | --- |
| `unit/phone.test.js` | phone formatting: typing digit by digit, prefixes, overflow, idempotence |
| `unit/feedback.test.js` | turning main-process errors into user-facing messages |
| `core.test.js` | authentication, catalog, genres, ratings, icons, profile, permissions |
| `data-integrity.test.js` | icon validation, deleting genres and games without losing data |
| `details-executable-password.test.js` | game details window, executable picker, password change |
| `localization.test.js` | switching the interface between Russian and English |
| `stats-favorites-reviews.test.js` | playtime stats, favorites, sorting, written reviews |
| `theme.test.js` | light and dark themes and how the choice is stored |
| `ui-polish.test.js` | closing modals with Escape, loading and empty states, genre warnings |

The end-to-end suites are **Windows-only**: they launch `C:\Windows\System32\whoami.exe` as a
stand-in for a game and check Windows-specific behaviour such as extracting an icon from an
executable. The unit tests run anywhere.

File dialogs are replaced at runtime through `electronApp.evaluate`, so no window ever blocks a run.

# End-to-end tests

The suites drive the packaged app through Playwright's Electron support: every test launches the real
Electron binary, clicks through the UI and checks what the user sees.

```bash
npm run build
npm test
```

Each run uses a throwaway `--user-data-dir`, so the tests never touch your own `data.db`.
Screenshots of failures are written to `tests/.artifacts/shots`.

| Suite | What it covers |
| --- | --- |
| `core.test.js` | authentication, catalog, genres, ratings, icons, profile, permissions |
| `localization.test.js` | switching the interface between Russian and English |
| `details-executable-password.test.js` | game details window, executable picker, password change |
| `stats-favorites-reviews.test.js` | playtime stats, favorites, sorting, written reviews |

The tests are **Windows-only**: they launch `C:\Windows\System32\whoami.exe` as a stand-in for a game
and check Windows-specific behaviour such as extracting an icon from an executable.

File dialogs are replaced at runtime through `electronApp.evaluate`, so no window ever blocks a run.

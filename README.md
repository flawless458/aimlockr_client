# aimlockr client

Minimal Electron client for [kirka.io](https://kirka.io). It opens the game in a
fullscreen window with the frame-rate limit disabled.

- Electron 45.2.3 (current latest release)
- plain JavaScript with checked JSDoc types
- [Effect](https://effect.website) for the startup sequence
- built in WSL2, packaged as a portable Windows folder

## Commands

```sh
npm install
npm test          # vitest
npm run typecheck # tsc with checkJs
npm run lint
npm run build     # vite -> dist/main/index.cjs
npm run dist:win  # build + pack + sync to the Windows run directory
npm run dev       # same as dist:win, then launch the game
```

`npm run dist:win` builds `out/win-unpacked` and, when run under WSL, syncs it to
`%LOCALAPPDATA%\aimlockr`. The first sync copies the whole Electron runtime
(~360 MB), later syncs only refresh `resources/app`. The first build also
downloads the official Electron 45.2.3 `win32-x64` zip into `out/.cache`
(~150 MB); later builds reuse it.

## Running the exe

A Windows PE cannot be executed from the repo's ext4 filesystem, so
`./out/win-unpacked/aimlockr.exe` is not runnable. Use the Windows-local copy:

```sh
/mnt/c/Users/<you>/AppData/Local/aimlockr/aimlockr.exe
```

or double-click `aimlockr.exe` in `%LOCALAPPDATA%\aimlockr`. `npm run dev` packs,
syncs and launches in one step.

Updating Electron is just a devDependency bump: the download URL, cache name and
run directory marker all derive from the pinned version, so the next
`npm run dist:win` downloads and unpacks the new build on its own.

## Fullscreen

The window is created **windowed**, then shown, then `setFullScreen(true)` is
called on `ready-to-show`. This is the same lifecycle Helium uses and avoids
Electron's conflicting `fullscreen: true` + `show: false` constructor state,
which is what made fullscreen choppy in earlier builds.

## Settings

Settings live next to the Electron user data in `%APPDATA%\aimlockr\config.json`:

```json
{
  "version": 1,
  "fullscreen": true,
  "uncapFps": true,
  "gpuAcceleration": true
}
```

The defaults are fullscreen, uncapped FPS and GPU acceleration. The file is
normalized and rewritten on every launch, so delete it to return to the
defaults. Files without `"version": 1` (including the earlier Rust client's
snake_case config) are ignored and replaced.

| key               | effect                                                              |
| ----------------- | ------------------------------------------------------------------- |
| `fullscreen`      | enter fullscreen once the page has painted                          |
| `uncapFps`        | `--disable-frame-rate-limit --disable-gpu-vsync --max-gum-fps=9999` |
| `gpuAcceleration` | when `false`, adds `--disable-gpu`                                  |

## Layout

```
src/main/settings.js        settings shape, defaults, JSON encode/decode
src/main/settings-path.js   %APPDATA%\aimlockr\config.json
src/main/settings-store.js  sync file store returning Effect values
src/main/switches.js        settings -> Chromium switches
src/main/window-options.js  window construction options (never fullscreen)
src/main/links.js           kirka/external/invalid URL policy + wiring
src/main/host.js            Electron surface used by the program (JSDoc types)
src/main/electron-host.js   real Electron adapter
src/main/program.js         Effect startup: show window, fullscreen on ready-to-show
src/main/index.js           entry: real host + store, runs the program
scripts/assemble-win.js     downloads Electron for Windows, packs, syncs, launches
```

`program.js` is framework-agnostic: it only talks to the `Host` interface, so
`test/program.test.js` runs the full startup sequence against an in-memory fake.

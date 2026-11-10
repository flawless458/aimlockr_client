# aimlockr client

Minimal Electron client for [kirka.io](https://kirka.io). It opens the game in a
fullscreen window with the frame-rate limit disabled.

- Electron 44.0.0, patched build (frame pacing + input starvation fix)
- raw mouse input for high-DPI/high-polling mice, KCC-style switches
- plain JavaScript with checked JSDoc types
- [Effect](https://effect.website) for the startup sequence
- built in WSL2, packaged as a portable Windows folder

## Commands

```sh
vp install       # install dependencies
vp test          # vitest
vp run typecheck # tsc with checkJs
vp run lint
vp run build     # vite -> dist/main/index.cjs
vp run dist:win  # build + pack + sync to the Windows run directory
vp run package:win # build + pack + zip for sharing
vp run dev       # same as dist:win, then launch the game
```

`vp run dist:win` builds `out/win-unpacked` and, when run under WSL, syncs it to
`%LOCALAPPDATA%\aimlockr`. The first sync copies the whole Electron runtime
(~360 MB), later syncs only refresh `resources/app`. The first build downloads
the patched Electron 44.0.0 `win32-x64` asset from
[bigjakk/Electron-Websocket-Fix](https://github.com/bigjakk/Electron-Websocket-Fix/releases/tag/v44.0.0)
into `out/.cache` (~150 MB); later builds reuse it.

## Running the exe

A Windows PE cannot be executed from the repo's ext4 filesystem, so
`./out/win-unpacked/aimlockr.exe` is not runnable. Use the Windows-local copy:

```sh
/mnt/c/Users/<you>/AppData/Local/aimlockr/aimlockr.exe
```

or double-click `aimlockr.exe` in `%LOCALAPPDATA%\aimlockr`. `vp run dev` packs,
syncs and launches in one step.

The client runs on the patched Electron build from
`bigjakk/Electron-Websocket-Fix`, which keeps draw calls throttled under
`--disable-frame-rate-limit` and fixes the Chromium 84+ input/WebSocket
starvation. The download URL, cache name and run-directory marker all derive
from the pinned `electron` version, but the release tag and asset name must
exist in that repository. Stock Electron builds are not used.

## Fullscreen

The window is created **windowed**, then shown, then `setFullScreen(true)` is
called on `ready-to-show`. This avoids Electron's conflicting
`fullscreen: true` + `show: false` constructor state and mirrors the lifecycle
used by the reference clients. The patched Electron 44 build provides the frame
pacing; no presentation workaround is applied.

The application menu is removed with `Menu.setApplicationMenu(null)`, so
tapping Alt (for Alt+Tab) cannot reveal a menu bar over the game.

## Input

On Windows the client patches the game canvas's `requestPointerLock` to pass
`{ unadjustedMovement: true }`, the same raw-input path KCC uses. Chromium then
reads the mouse through `WM_INPUT`, bypassing OS acceleration and preserving the
raw deltas from high-DPI/high-polling mice instead of the accelerated cursor
stream. If the browser rejects raw input the request falls back to the game's
own options, so pointer lock still works.

Set `"rawInput": false` in the settings file to let Kirka's own in-game raw
input toggle decide instead.

## Chromium switches

The switch set follows KCC:

- uncapped FPS: `--disable-frame-rate-limit --disable-gpu-vsync --max-gum-fps=9999`
- always on: background throttling/occlusion off, autoplay allowed, overscroll
  navigation and pull-to-refresh off, GPU blocklist ignored
- Windows: `--use-angle=d3d11` and
  `--disable-features=CalculateNativeWinOcclusion,HardwareMediaKeyHandling`
- `gpuAcceleration: false` adds `--disable-gpu`

No `--disable-direct-composition` or other frame-pacing workarounds are passed;
the patched Electron runtime handles pacing itself.

## Giving it to a friend

```sh
vp run package:win
```

This produces `out/aimlockr-<version>-win64.zip` (~150 MB). Send that zip.

Your friend unzips it anywhere (Desktop, a games folder, a USB stick) and runs
`aimlockr.exe`. There is nothing to install, no admin rights, no Node, no
runtime. Settings are created at `%APPDATA%\aimlockr\config.json` on first run.
Windows SmartScreen will warn about an unsigned exe: **More info → Run anyway**.

The zip is just a copy of `out/win-unpacked`, so you can also copy that folder
(or `%LOCALAPPDATA%\aimlockr`) directly. That folder is the full app; the
`aimlockr.exe` inside it is the entry point.

If you specifically want a single self-extracting `.exe`, run this in the
`out/win-unpacked` folder with 7-Zip/NanaZip installed:

```powershell
7z.exe a -sfx aimlockr-portable.exe .\*
```

It is still an archive that extracts first; the zip is simpler and less likely
to trigger antivirus warnings.

## Settings

Settings live next to the Electron user data in `%APPDATA%\aimlockr\config.json`:

```json
{
  "version": 1,
  "fullscreen": true,
  "uncapFps": true,
  "gpuAcceleration": true,
  "rawInput": true
}
```

The defaults are fullscreen, uncapped FPS, GPU acceleration and raw input. The
file is normalized and rewritten on every launch, so delete it to return to the
defaults. Files without `"version": 1` (including the earlier Rust client's
snake_case config) are ignored and replaced.

| key               | effect                                                              |
| ----------------- | ------------------------------------------------------------------- |
| `fullscreen`      | enter fullscreen once the page has painted                          |
| `uncapFps`        | `--disable-frame-rate-limit --disable-gpu-vsync --max-gum-fps=9999` |
| `gpuAcceleration` | when `false`, adds `--disable-gpu`                                  |
| `rawInput`        | when `true` (default), forces `unadjustedMovement` pointer lock on Windows |

## Layout

```
src/main/settings.js        settings shape, defaults, JSON encode/decode
src/main/settings-path.js   %APPDATA%\aimlockr\config.json
src/main/settings-store.js  sync file store returning Effect values
src/main/switches.js        settings -> Chromium switches
src/main/window-options.js  window construction options (never fullscreen)
src/main/links.js           kirka/external/invalid URL policy + wiring
src/main/raw-input.js       pointer-lock patch for raw mouse movement
src/main/host.js            Electron surface used by the program (JSDoc types)
src/main/electron-host.js   real Electron adapter
src/main/program.js         Effect startup: menu, switches, window, fullscreen, raw input
src/main/index.js           entry: real host + store, runs the program
scripts/assemble-win.js     downloads Electron for Windows, packs, syncs, launches
```

`program.js` is framework-agnostic: it only talks to the `Host` interface, so
`test/program.test.js` runs the full startup sequence against an in-memory fake.

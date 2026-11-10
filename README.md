# aimlockr client

Minimal Electron client for [kirka.io](https://kirka.io). It opens the game in a
fullscreen window with the frame-rate limit disabled and an in-game menu injected
over the game.

- Electron 44.0.0, patched build (frame pacing + input starvation fix)
- raw mouse input for high-DPI/high-polling mice, KCC-style switches
- injected SolidJS menu with the neverlose-style dark glass look
- plain JavaScript with checked JSDoc types for main/shared code, Solid JSX for the menu
- [Effect](https://effect.website) for the startup sequence
- built in WSL2, packaged as a portable Windows folder

## Commands

```sh
npm install          # install dependencies
npm test             # vitest (unit + jsdom component tests)
npm run typecheck    # tsc with checkJs
npm run lint
npm run build        # main + preload + ui bundles
npm run dist:win     # build + pack + sync to the Windows run directory
npm run package:win  # build + pack + zip for sharing
npm run dev          # same as dist:win, then launch the game
```

`npm run dist:win` builds `out/win-unpacked` and, when run under WSL, syncs it to
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

or double-click `aimlockr.exe` in `%LOCALAPPDATA%\aimlockr`. `npm run dev` packs,
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

## In-game menu

Press **Right Shift** to open the menu, **Right Shift** again or **Escape** to
close it, or click outside the panel when *Close On Outside Click* is enabled.
Opening the menu releases pointer lock. The keybind is configurable on the
**Interface** tab and accepts modifier keys, so the menu opens even while the
game holds keyboard focus on its hidden chat field.

The menu is a SolidJS app built as a single IIFE (`dist/ui/menu.js`) and injected
on `dom-ready`. A sandboxed preload exposes a small `window.aimlockr` bridge;
that bridge reads and writes preferences over IPC. The menu never needs Node
access in the page.

- **Client** tab: fullscreen, uncapped FPS, GPU acceleration, and real raw input.
- **Interface** tab: menu keybind, close/open behaviour, menu scale, accent
  colour with HSV picker, backdrop blur, animations, motion speed, interface
  sounds, and sound volume.
- Search filters both tabs and shows the owning tab/section for each result.
- Row descriptions are not printed under every control. Hover a row for five
  seconds to show its explanatory tooltip.
- The panel always uses the same tall fixed shell, so switching tabs or searching
  never collapses or resizes the menu.
- Launch flags that Chromium consumes at startup (`uncapFps`, `gpuAcceleration`,
  `rawInput`) show a restart chip. Fullscreen is applied to the live window.
- The account popover holds interface reset, restart, and quit actions, with
  confirmation for destructive actions.
- The menu stores its preferences separately from the launch flags, so changing
  the accent or scale never rewrites process flags.

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
npm run package:win
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

Launch flags live in `%APPDATA%\aimlockr\config.json`:

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

Menu preferences live beside it in `%APPDATA%\aimlockr\menu.json`:

```json
{
  "version": 2,
  "keybind": "ShiftRight",
  "closeOnOutsideClick": true,
  "openOnLaunch": false,
  "scale": 100,
  "accent": "#4e83ff",
  "blur": true,
  "animations": true,
  "motion": "normal",
  "sounds": false,
  "soundVolume": 60
}
```

Both files are validated field by field. Invalid, missing, or unknown values fall
back to the defaults instead of failing startup. A version 1 `menu.json` is
migrated on load: its old `Insert` keybind default becomes `ShiftRight`, and
every other stored value is kept.

## Menu layout

```
src/shared/launch-settings.js  launch settings shape, defaults, restart diff
src/shared/menu-settings.js    menu settings shape, defaults, JSON encode/decode
src/shared/color.js            hex/HSV conversions, mixing, alpha helpers
src/shared/keybinds.js         supported hotkey codes and labels
src/shared/search.js           section/row filtering
src/shared/ipc.js              IPC channel names and URL validation
src/shared/api-contract.js     JSDoc types shared by preload and the menu

src/main/menu-settings-store.js  menu.json file store returning Effect values
src/main/preferences.js          in-memory preference state, restart diff, writes
src/main/ipc.js                  ipcMain handlers
src/preload/api.js               ipcRenderer -> window.aimlockr bridge
src/preload/index.js             contextBridge installation
src/ui/main.jsx                  styles + mount entry, built as dist/ui/menu.js
src/ui/boot.jsx                  DOM mount, shortcuts, pointer-lock handling
src/ui/controller.js             UI state, optimistic updates, error reporting
src/ui/sections.js               tab/row definitions and tooltip copy
src/ui/components/               Sidebar, Toolbar, SettingsPage, controls, icons
src/ui/styles.css                scoped neverlose-style theme
```

The UI is bundled into one self-contained file. CSS is imported as raw text and
injected into a scoped `<style>` element under `.aimlockr-root`, so no game
styles are affected and no separate CSS request is needed.

## Layout

```
src/main/settings.js        re-exports the shared launch settings
src/main/settings-path.js   %APPDATA%\aimlockr\config.json and menu.json paths
src/main/settings-store.js  sync file store returning Effect values
src/main/switches.js        settings -> Chromium switches
src/main/window-options.js  window construction options (never fullscreen)
src/main/links.js           kirka/external/invalid URL policy + wiring
src/main/raw-input.js       pointer-lock patch for raw mouse movement
src/main/host.js            Electron surface used by the program (JSDoc types)
src/main/electron-host.js   real Electron adapter
src/main/program.js         Effect startup: stores, switches, window, IPC, raw input, menu
src/main/index.js           entry: reads bundles, wires real host + stores
scripts/assemble-win.js     downloads Electron for Windows, packs, syncs, launches
```

`program.js` is framework-agnostic: it only talks to the `Host` interface, so
`test/program.test.js` runs the full startup sequence against an in-memory fake.
The menu is tested in jsdom with the real Solid components and a fake desktop
bridge, including keyboard shortcuts, tooltips, popovers, search, confirmations,
and save failures.

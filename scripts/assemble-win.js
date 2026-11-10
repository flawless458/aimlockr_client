import { execFileSync, spawn } from 'node:child_process';
import { cpSync, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { get } from 'node:https';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const electronVersion = String(pkg.devDependencies.electron).replace(/^[^\d]*/, '');
const executableName = 'aimlockr.exe';
const buildEntry = join(root, 'dist/main/index.cjs');
const cacheDirectory = join(root, 'out/.cache');
const unpackedDirectory = join(root, 'out/win-unpacked');
const patchedRepository = 'bigjakk/Electron-Websocket-Fix';
const zipName = `electron-v${electronVersion}-ws-frameThrottle-frameCap2-patched-windows-x64.zip`;
const zipPath = join(cacheDirectory, zipName);
const runtimeLabel = `patched-${electronVersion}`;
const downloadUrl = `https://github.com/${patchedRepository}/releases/download/v${electronVersion}/${zipName}`;

const isWindows = process.platform === 'win32';

/** @returns {boolean} */
const isWsl = () =>
  !isWindows && existsSync('/proc/version') && readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');

/**
 * @param {string} url
 * @param {string} destination
 * @param {number} [redirects]
 * @returns {Promise<void>}
 */
const download = (url, destination, redirects = 0) =>
  new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error(`too many redirects for ${url}`));
      return;
    }
    get(url, { headers: { 'user-agent': 'aimlockr-build' } }, (response) => {
      const status = response.statusCode ?? 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        download(new URL(response.headers.location, url).href, destination, redirects + 1).then(resolve, reject);
        return;
      }
      if (status !== 200) {
        response.resume();
        reject(new Error(`HTTP ${status} for ${url}`));
        return;
      }
      const file = createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });

/**
 * @param {string} path
 * @returns {string}
 */
const toWindowsPath = (path) => execFileSync('wslpath', ['-w', path], { encoding: 'utf8' }).trim();

/**
 * @param {string} path
 * @returns {string}
 */
const toWslPath = (path) => execFileSync('wslpath', ['-u', path], { encoding: 'utf8' }).trim();

/**
 * @returns {string}
 */
const windowsLocalAppData = () =>
  execFileSync('cmd.exe', ['/c', 'echo', '%LOCALAPPDATA%'], {
    cwd: '/mnt/c',
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();

/**
 * @returns {string}
 */
const runDirectory = () => {
  if (!isWsl()) return unpackedDirectory;
  return join(toWslPath(windowsLocalAppData()), 'aimlockr');
};

/**
 * @param {string} target
 * @returns {string}
 */
const syncRunDirectory = (target) => {
  const marker = join(target, '.electron-version');
  const installed = existsSync(marker) ? readFileSync(marker, 'utf8').trim() : '';
  if (installed === runtimeLabel) {
    rmSync(join(target, 'resources/app'), { recursive: true, force: true });
    cpSync(join(unpackedDirectory, 'resources/app'), join(target, 'resources/app'), { recursive: true });
    return target;
  }
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(unpackedDirectory, target, { recursive: true });
  writeFileSync(marker, `${runtimeLabel}\n`);
  return target;
};

/**
 * @param {string} directory
 * @returns {string}
 */
const displayedExecutable = (directory) => {
  const path = join(directory, executableName);
  return isWsl() ? toWindowsPath(path) : path;
};

/**
 * @param {string} directory
 * @returns {void}
 */
const launch = (directory) => {
  if (isWindows) {
    spawn(join(directory, executableName), [], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  if (!isWsl()) {
    console.error('[aimlockr] launching is only supported on Windows and WSL');
    process.exitCode = 1;
    return;
  }
  const target = join(directory, executableName);
  spawn('cmd.exe', ['/c', 'start', '', toWindowsPath(target)], { cwd: directory, detached: true, stdio: 'ignore' }).unref();
};

const fetchElectron = async () => {
  if (existsSync(zipPath)) return;
  console.log(`[aimlockr] downloading patched Electron ${electronVersion} for Windows`);
  mkdirSync(cacheDirectory, { recursive: true });
  await download(downloadUrl, zipPath);
};

const unpack = () => {
  rmSync(unpackedDirectory, { recursive: true, force: true });
  mkdirSync(unpackedDirectory, { recursive: true });
  execFileSync('unzip', ['-qo', zipPath, '-d', unpackedDirectory]);

  renameSync(join(unpackedDirectory, 'electron.exe'), join(unpackedDirectory, executableName));
  rmSync(join(unpackedDirectory, 'resources/default_app.asar'), { force: true });

  const appDirectory = join(unpackedDirectory, 'resources/app');
  mkdirSync(appDirectory, { recursive: true });
  cpSync(join(root, 'dist'), join(appDirectory, 'dist'), { recursive: true });
  writeFileSync(
    join(appDirectory, 'package.json'),
    `${JSON.stringify({ name: 'aimlockr', version: pkg.version, main: 'dist/main/index.cjs' }, null, 2)}\n`
  );
};

if (!existsSync(buildEntry)) {
  console.error('[aimlockr] dist/main/index.cjs is missing — run `npm run build` first');
  process.exit(1);
}

try {
  await fetchElectron();
} catch (error) {
  console.error(`[aimlockr] no patched Electron ${electronVersion} build available: ${downloadUrl}`);
  throw error;
}
unpack();
const directory = syncRunDirectory(runDirectory());
console.log(`[aimlockr] Patched Electron ${electronVersion} ready: ${displayedExecutable(directory)}`);
if (process.argv.includes('--launch')) launch(directory);

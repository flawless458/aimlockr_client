import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const source = join(root, 'out/win-unpacked');
const target = join(root, `out/aimlockr-${pkg.version}-win64.zip`);
const archiver = process.platform === 'win32' ? 'tar.exe' : 'bsdtar';

if (!existsSync(join(source, 'aimlockr.exe'))) {
  console.error('[aimlockr] out/win-unpacked/aimlockr.exe is missing — run `vp run dist:win` first');
  process.exit(1);
}

rmSync(target, { force: true });
execFileSync(archiver, ['-a', '-cf', target, '-C', source, '.'], { stdio: 'inherit' });
const megabytes = (statSync(target).size / 1048576).toFixed(1);
console.log(`[aimlockr] portable zip (${megabytes} MB): ${target}`);

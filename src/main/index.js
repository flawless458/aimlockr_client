import { app } from 'electron';
import { Cause, Effect } from 'effect';
import { APP_USER_MODEL_ID, createElectronHost } from './electron-host.js';
import { launch } from './program.js';
import { createSettingsStore } from './settings-store.js';
import { resolveSettingsPath } from './settings-path.js';

const host = createElectronHost();
const store = createSettingsStore(resolveSettingsPath());

app.setAppUserModelId(APP_USER_MODEL_ID);

/**
 * @param {Cause.Cause<unknown>} cause
 * @returns {Effect.Effect<void>}
 */
const reportFailure = (cause) =>
  Effect.sync(() => {
    console.error('[aimlockr] failed to start:', Cause.pretty(cause));
    host.quit();
  });

Effect.runPromise(launch({ host, store }).pipe(Effect.catchCause(reportFailure)));

import { createSignal, For, Match, onCleanup, Show, Switch } from 'solid-js';
import { MOTION_SPEED_LABELS } from '../../shared/motion.js';
import { ColorPicker } from './ColorPicker.jsx';
import { HighlightText } from './HighlightText.jsx';
import { Icon } from './Icon.jsx';
import { KeybindRow } from './KeybindRow.jsx';
import { Select } from './Select.jsx';
import { Slider } from './Slider.jsx';
import { Toggle } from './Toggle.jsx';

/**
 * @param {{
 *   sections: ReadonlyArray<any>,
 *   controller: import('../controller.js').MenuController,
 *   query: string,
 *   tab: string
 * }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const SettingsPage = (props) => {
  const state = () => props.controller.state;
  const searching = () => props.query.trim() !== '';
  const resultCount = () => props.sections.reduce((total, section) => total + section.rows.length, 0);
  const [tooltip, setTooltip] = createSignal(null);
  let tooltipTimer;

  const scheduleTooltip = (row) => {
    clearTimeout(tooltipTimer);
    if (!noteFor(row)) return;
    tooltipTimer = setTimeout(() => setTooltip({ label: row.label, text: noteFor(row) }), 5000);
  };

  const hideTooltip = () => {
    clearTimeout(tooltipTimer);
    setTooltip(null);
  };

  onCleanup(() => clearTimeout(tooltipTimer));

  const platformBlocked = (row) =>
    Boolean(row.platformOnly) && state().app.platform !== 'unknown' && state().app.platform !== row.platformOnly;

  const noteFor = (row) => {
    if (platformBlocked(row)) return 'Windows only';
    if (row.key === 'soundVolume' && !state().menu.sounds) return 'Enable sounds to adjust';
    return row.note;
  };

  return (
    <div class="settings-page" classList={{ 'is-searching': searching(), 'is-client': props.tab === 'client' }}>
      <Show when={searching()}>
        <div class="search-summary" aria-live="polite">
          <span class="search-count">{resultCount()} {resultCount() === 1 ? 'result' : 'results'}</span>
          <span class="search-query">for “{props.query}”</span>
        </div>
      </Show>

      <Show
        when={props.sections.length > 0}
        fallback={
          <div class="empty-state">
            <Icon name="search" size={26} />
            <span class="empty-title">No settings found</span>
            <span class="empty-copy">Nothing matches “{props.query}”.</span>
          </div>
        }
      >
        <For each={props.sections}>
          {(section, sectionIndex) => (
            <section
              class="settings-section"
              classList={{ 'is-wide': Boolean(section.wide) }}
              style={{ '--section-index': sectionIndex() }}
            >
              <h3 class="section-title">
                <Show when={searching()}>
                  <span class="section-tab">{section.tab === 'interface' ? 'Interface' : 'Client'}</span>
                </Show>
                {section.title}
              </h3>
              <div class="settings-card">
                <For each={section.rows}>
                  {(row, rowIndex) => (
                    <div
                      class="setting-row"
                      classList={{ 'is-last': rowIndex() === section.rows.length - 1 }}
                      onMouseEnter={() => scheduleTooltip(row)}
                      onMouseLeave={hideTooltip}
                    >
                      <div class="row-copy">
                        <span class="row-icon"><Icon name={row.icon} size={props.tab === 'client' ? 18 : 16} /></span>
                        <span class="row-label"><HighlightText text={row.label} query={props.query} /></span>
                      </div>
                      <div class="row-control">
                        <Switch>
                          <Match when={row.kind === 'launch-toggle'}>
                            <Toggle
                              checked={state().launch[row.key]}
                              label={row.label}
                              disabled={platformBlocked(row)}
                              onChange={(value) => void props.controller.updateLaunch({ [row.key]: value })}
                            />
                          </Match>
                          <Match when={row.kind === 'menu-toggle'}>
                            <Toggle
                              checked={state().menu[row.key]}
                              label={row.label}
                              onChange={(value) => void props.controller.updateMenu({ [row.key]: value })}
                            />
                          </Match>
                          <Match when={row.kind === 'menu-select'}>
                            <Select
                              value={state().menu[row.key]}
                              options={row.options.map((option) => ({
                                ...option,
                                label: MOTION_SPEED_LABELS[option.value] ?? option.label
                              }))}
                              label={row.label}
                              onChange={(value) => void props.controller.updateMenu({ [row.key]: value })}
                            />
                          </Match>
                          <Match when={row.kind === 'menu-slider'}>
                            <Slider
                              value={state().menu[row.key]}
                              min={row.min}
                              max={row.max}
                              step={row.step}
                              suffix={row.suffix}
                              label={row.label}
                              onPreview={row.key === 'scale' ? props.controller.setScalePreview : undefined}
                              onCommit={(value) => void props.controller.updateMenu({ [row.key]: value })}
                            />
                          </Match>
                          <Match when={row.kind === 'menu-keybind'}>
                            <KeybindRow
                              value={state().menu[row.key]}
                              label={row.label}
                              onChange={(value) => void props.controller.updateMenu({ [row.key]: value })}
                            />
                          </Match>
                          <Match when={row.kind === 'menu-color'}>
                            <ColorPicker
                              value={state().menu[row.key]}
                              label={row.label}
                              onChange={(value) => void props.controller.updateMenu({ [row.key]: value })}
                            />
                          </Match>
                        </Switch>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </section>
          )}
        </For>
      </Show>

      <Show when={tooltip()}>
        <div class="menu-tooltip" role="tooltip">
          <Icon name="info" size={13} class="menu-tooltip-icon" />
          <span class="menu-tooltip-label">{tooltip().label}</span>
          <span>{tooltip().text}</span>
        </div>
      </Show>
    </div>
  );
};

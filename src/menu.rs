use crate::config::Config;

pub const KEY_FULLSCREEN: &str = "fullscreen";
pub const KEY_GPU_ACCELERATION: &str = "gpuAcceleration";
pub const KEY_UNCAP_FPS: &str = "uncapFps";

pub fn preload_script(config: &Config) -> String {
    const TEMPLATE: &str = r#"
(function () {
  'use strict';

  var STATE = {
    fullscreen: __FULLSCREEN__,
    gpuAcceleration: __GPU_ACCELERATION__,
    uncapFps: __UNCAP_FPS__
  };

  var CSS = ''
    + '#aimlockr-menu { position: fixed; top: 8px; right: 8px; z-index: 999999;'
    + '  font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #e8e8e8; }'
    + '#aimlockr-menu .al-toggle { background: #1b1f24; color: #e8e8e8; border: 1px solid #3a4149;'
    + '  border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 13px; }'
    + '#aimlockr-menu .al-toggle:hover { background: #252b32; }'
    + '#aimlockr-menu .al-panel { display: none; margin-top: 4px; background: #1b1f24;'
    + '  border: 1px solid #3a4149; border-radius: 4px; padding: 10px 12px; min-width: 190px;'
    + '  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45); }'
    + '#aimlockr-menu .al-panel.open { display: block; }'
    + '#aimlockr-menu .al-title { font-weight: bold; margin: 0 0 8px; letter-spacing: 0.4px; }'
    + '#aimlockr-menu label.al-row { display: flex; align-items: center; gap: 8px;'
    + '  padding: 4px 0; cursor: pointer; user-select: none; }'
    + '#aimlockr-menu label.al-row:hover { color: #ffffff; }'
    + '#aimlockr-menu input[type="checkbox"] { accent-color: #4c9aff; width: 14px; height: 14px;'
    + '  margin: 0; cursor: pointer; }'
    + '#aimlockr-menu .al-note { display: none; margin: 8px 0 0; font-size: 11px; color: #9aa4af; }';

  var HTML = ''
    + '<button class="al-toggle" type="button">aimlockr</button>'
    + '<div class="al-panel">'
    + '  <p class="al-title">Settings</p>'
    + '  <label class="al-row"><input type="checkbox" data-key="fullscreen"> Full screen</label>'
    + '  <label class="al-row"><input type="checkbox" data-key="gpuAcceleration"> GPU acceleration</label>'
    + '  <label class="al-row"><input type="checkbox" data-key="uncapFps"> Uncap FPS</label>'
    + '  <p class="al-note">GPU / FPS changes apply after restart.</p>'
    + '</div>';

  function post(key, value) {
    if (window.ipc && typeof window.ipc.postMessage === 'function') {
      window.ipc.postMessage(JSON.stringify({ key: key, value: value }));
    }
  }

  function inject() {
    if (document.getElementById('aimlockr-menu') || !document.body || !document.head) return;

    var style = document.createElement('style');
    style.id = 'aimlockr-menu-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.id = 'aimlockr-menu';
    root.innerHTML = HTML;
    document.body.appendChild(root);

    var panel = root.querySelector('.al-panel');
    var note = root.querySelector('.al-note');

    root.querySelector('.al-toggle').addEventListener('click', function () {
      panel.classList.toggle('open');
    });

    var inputs = root.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i++) {
      (function (input) {
        var key = input.getAttribute('data-key');
        input.checked = !!STATE[key];
        input.addEventListener('change', function () {
          STATE[key] = input.checked;
          post(key, input.checked);
          if (key !== 'fullscreen') note.style.display = 'block';
        });
      })(inputs[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
"#;

    TEMPLATE
        .replace("__FULLSCREEN__", if config.fullscreen { "true" } else { "false" })
        .replace(
            "__GPU_ACCELERATION__",
            if config.gpu_acceleration { "true" } else { "false" },
        )
        .replace(
            "__UNCAP_FPS__",
            if config.uncap_fps { "true" } else { "false" },
        )
}

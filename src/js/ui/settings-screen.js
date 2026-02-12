// Settings overlay for launch configuration
class SettingsScreen {
  constructor(overlay, connector, appState) {
    this.overlay = overlay;
    this.connector = connector;
    this.appState = appState;
    this.visible = false;
    this._build();
  }

  _build() {
    this.overlay.innerHTML = `
      <div style="
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: #1d2b53; border: 2px solid #c2c3c7;
        padding: 20px; color: #fff1e8;
        font-family: monospace; font-size: 14px;
        min-width: 400px; image-rendering: auto;
        max-height: 90vh; overflow-y: auto;
      ">
        <h2 style="margin: 0 0 15px; color: #ffec27; font-size: 16px;">CLOFFICE PIXEL - SETTINGS</h2>

        <div style="margin-bottom: 15px; padding: 10px; background: #000; border: 1px solid #5f574f;">
          <p style="margin: 0 0 8px; color: #00e436; font-size: 13px;">LISTEN MODE (Recommended)</p>
          <p style="margin: 0 0 8px; color: #c2c3c7; font-size: 11px;">
            Watches your active Claude Code terminal session automatically.
            Just run Claude Code normally in your terminal.
          </p>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="si-listen" style="
              background: #29adff; color: #fff1e8; border: none;
              padding: 8px 16px; font-family: monospace; font-size: 14px; cursor: pointer;
            ">LISTEN</button>
            <span id="si-listen-status" style="color: #83769c; font-size: 11px;"></span>
          </div>
        </div>

        <div id="si-sessions-section" style="margin-bottom: 15px; padding: 10px; background: #000; border: 1px solid #5f574f; display: none;">
          <p style="margin: 0 0 8px; color: #ffa300; font-size: 13px;">ACTIVE SESSIONS</p>
          <div id="si-sessions-list" style="max-height: 120px; overflow-y: auto;">
          </div>
        </div>

        <details style="margin-bottom: 10px;">
          <summary style="color: #c2c3c7; cursor: pointer; font-size: 12px;">Advanced: Launch new session (API key)</summary>
          <div style="margin-top: 10px;">
            <label style="display: block; margin-bottom: 5px; color: #c2c3c7;">Prompt:</label>
            <textarea id="si-prompt" rows="3" style="
              width: 100%; background: #000; color: #fff1e8; border: 1px solid #5f574f;
              padding: 5px; font-family: monospace; font-size: 12px; resize: vertical;
            ">Help me with this project</textarea>

            <label style="display: block; margin: 10px 0 5px; color: #c2c3c7;">Working Directory:</label>
            <input id="si-workdir" type="text" value="" style="
              width: 100%; background: #000; color: #fff1e8; border: 1px solid #5f574f;
              padding: 5px; font-family: monospace; font-size: 12px;
            ">
            <button id="si-launch" style="
              margin-top: 8px;
              background: #008751; color: #fff1e8; border: none;
              padding: 8px 16px; font-family: monospace; font-size: 14px; cursor: pointer;
            ">LAUNCH</button>
          </div>
        </details>

        <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
          <button id="si-aot" style="
            background: #5f574f; color: #fff1e8; border: none;
            padding: 8px 16px; font-family: monospace; font-size: 14px; cursor: pointer;
          ">ALWAYS ON TOP: OFF</button>
        </div>

        <div style="margin-top: 10px; display: flex; gap: 10px;">
          <button id="si-demo" style="
            background: #ab5236; color: #fff1e8; border: none;
            padding: 8px 16px; font-family: monospace; font-size: 14px; cursor: pointer;
          ">DEMO MODE</button>
          <button id="si-close" style="
            background: #5f574f; color: #fff1e8; border: none;
            padding: 8px 16px; font-family: monospace; font-size: 14px; cursor: pointer;
          ">CLOSE</button>
        </div>

        <details style="margin-top: 10px;">
          <summary style="color: #ffa300; cursor: pointer; font-size: 13px;">TEST TRIGGERS</summary>
          <div style="margin-top: 8px; padding: 10px; background: #000; border: 1px solid #5f574f;">
            <p style="margin: 0 0 6px; color: #83769c; font-size: 11px;">STATES</p>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;" id="si-test-states">
              <button class="si-test" data-test="idle" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">IDLE</button>
              <button class="si-test" data-test="thinking" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">THINK</button>
              <button class="si-test" data-test="delegating" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">DELEG</button>
              <button class="si-test" data-test="coding" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">CODE</button>
              <button class="si-test" data-test="done" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">DONE</button>
              <button class="si-test" data-test="multi_agent" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">+AGENT</button>
            </div>
            <p style="margin: 0 0 6px; color: #83769c; font-size: 11px;">EFFECTS</p>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
              <button class="si-test" data-test="panic_on" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">PANIC ON</button>
              <button class="si-test" data-test="panic_off" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">PANIC OFF</button>
              <button class="si-test" data-test="snow_on" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">SNOW ON</button>
              <button class="si-test" data-test="snow_off" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">SNOW OFF</button>
              <button class="si-test" data-test="fire_on" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">FIRE ON</button>
              <button class="si-test" data-test="fire_off" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">FIRE OFF</button>
            </div>
            <p style="margin: 0 0 6px; color: #83769c; font-size: 11px;">WINDOW SKY</p>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
              <button class="si-test" data-test="sky_auto" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">AUTO</button>
              <button class="si-test" data-test="sky_night" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">NIGHT</button>
              <button class="si-test" data-test="sky_sunrise" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">SUNRISE</button>
              <button class="si-test" data-test="sky_day" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">DAY</button>
              <button class="si-test" data-test="sky_sunset" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">SUNSET</button>
            </div>
            <p style="margin: 0 0 6px; color: #83769c; font-size: 11px;">ACTIONS</p>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <button class="si-test" data-test="exit" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">EXIT WORKERS</button>
              <button class="si-test" data-test="janitor" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">JANITOR</button>
              <button class="si-test" data-test="error" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">ERROR</button>
              <button class="si-test" data-test="commit" style="background:#5f574f;color:#fff1e8;border:none;padding:4px 8px;font-family:monospace;font-size:11px;cursor:pointer;">COMMIT</button>
            </div>
          </div>
        </details>

        <details style="margin-top: 10px;">
          <summary style="color: #ffec27; cursor: pointer; font-size: 12px;">KEYBOARD SHORTCUTS</summary>
          <div style="margin-top: 8px; padding: 10px; background: #000; border: 1px solid #5f574f;">
          <table style="width: 100%; font-size: 11px; color: #c2c3c7; border-spacing: 2px 3px;">
            <tr><td style="color: #29adff; width: 50px;">ESC</td><td>Open / close settings</td></tr>
            <tr><td style="color: #29adff;">D</td><td>Toggle demo mode (auto-cycle states)</td></tr>
            <tr><td style="color: #29adff;">R</td><td>Reset to initial state</td></tr>
            <tr><td style="color: #29adff;">T</td><td>Toggle always-on-top</td></tr>
            <tr><td style="color: #29adff;">S</td><td>Cycle active sessions</td></tr>
            <tr><td style="color: #29adff;">E</td><td>Workers exit one by one</td></tr>
            <tr><td style="color: #29adff;">F</td><td>Toggle fire test</td></tr>
            <tr><td style="color: #29adff;">P</td><td>Toggle leader panic</td></tr>
            <tr><td style="color: #29adff;">I</td><td>Toggle snow storm</td></tr>
            <tr><td style="color: #29adff;">N</td><td>Cycle window sky (auto/night/day)</td></tr>
            <tr><td colspan="2" style="padding-top: 4px; color: #83769c;">--- Test States ---</td></tr>
            <tr><td style="color: #ffa300;">0</td><td>IDLE</td></tr>
            <tr><td style="color: #ffa300;">1</td><td>THINKING</td></tr>
            <tr><td style="color: #ffa300;">2</td><td>DELEGATING</td></tr>
            <tr><td style="color: #ffa300;">3</td><td>CODING</td></tr>
            <tr><td style="color: #ffa300;">4</td><td>DONE</td></tr>
            <tr><td style="color: #ffa300;">5</td><td>MULTI-AGENT</td></tr>
            <tr><td style="color: #ffa300;">6</td><td>Janitor</td></tr>
            <tr><td style="color: #ffa300;">7-9</td><td>Errors</td></tr>
          </table>
          </div>
        </details>
      </div>
    `;

    this.listenButton = this.overlay.querySelector('#si-listen');
    this.listenStatus = this.overlay.querySelector('#si-listen-status');
    this.sessionsSection = this.overlay.querySelector('#si-sessions-section');
    this.sessionsList = this.overlay.querySelector('#si-sessions-list');

    this.listenButton.addEventListener('click', async () => {
      if (this.connector.watching) {
        await this.connector.unwatch();
        this.listenButton.textContent = 'LISTEN';
        this.listenButton.style.background = '#29adff';
        this.listenStatus.textContent = '';
        this.sessionsSection.style.display = 'none';
      } else {
        await this.connector.watch();
        this.listenButton.textContent = 'STOP LISTENING';
        this.listenButton.style.background = '#ff004d';
        this.listenStatus.textContent = 'Watching for active sessions...';
      }
    });

    // Update status when watch finds a session
    this.connector.onWatchStatusChange = (status) => {
      if (status.watching && status.file) {
        this.listenStatus.textContent = 'Watching: ' + status.file;
        this.listenStatus.style.color = '#00e436';
      } else if (status.watching) {
        this.listenStatus.textContent = 'Watching for active sessions...';
        this.listenStatus.style.color = '#83769c';
      } else {
        this.listenStatus.textContent = '';
      }
    };

    this.aotButton = this.overlay.querySelector('#si-aot');
    this._refreshAotButton();
    this.aotButton.addEventListener('click', async () => {
      const isOnTop = await window.appWindow.toggleAlwaysOnTop();
      this.aotButton.textContent = `ALWAYS ON TOP: ${isOnTop ? 'ON' : 'OFF'}`;
      this.aotButton.style.background = isOnTop ? '#008751' : '#5f574f';
    });

    this.overlay.querySelector('#si-launch').addEventListener('click', () => {
      const prompt = this.overlay.querySelector('#si-prompt').value;
      const workDir = this.overlay.querySelector('#si-workdir').value;
      this.connector.start(prompt, workDir || undefined);
      this.hide();
    });

    this.overlay.querySelector('#si-demo').addEventListener('click', () => {
      this.hide();
      if (this.onDemo) this.onDemo();
    });

    this.overlay.querySelector('#si-close').addEventListener('click', () => {
      this.hide();
    });

    // Test trigger buttons
    for (const btn of this.overlay.querySelectorAll('.si-test')) {
      btn.addEventListener('click', () => {
        if (this.onTest) this.onTest(btn.dataset.test);
      });
    }
  }

  updateSessionList(sessions) {
    if (!sessions || sessions.length === 0) {
      this.sessionsSection.style.display = 'none';
      return;
    }

    this.sessionsSection.style.display = 'block';
    const selectedId = this.appState?.selectedSessionId;

    let html = '';
    for (const s of sessions) {
      const isSelected = s.id === selectedId;
      const age = Math.floor((Date.now() - s.mtime) / 60000);
      const ageText = age < 1 ? 'now' : age + 'm ago';
      const proj = (s.project || 'unknown').substring(0, 30);
      html += `<div
        data-session-id="${s.id}"
        style="
          padding: 4px 8px; margin: 2px 0; cursor: pointer;
          background: ${isSelected ? '#29adff' : '#1d2b53'};
          color: ${isSelected ? '#fff1e8' : '#c2c3c7'};
          font-size: 11px; border: 1px solid ${isSelected ? '#29adff' : '#5f574f'};
        "
        class="session-item"
      >${proj} <span style="color: #83769c; float: right;">${ageText}</span></div>`;
    }
    this.sessionsList.innerHTML = html;

    // Add click handlers
    for (const el of this.sessionsList.querySelectorAll('.session-item')) {
      el.addEventListener('click', () => {
        const id = el.dataset.sessionId;
        if (this.appState) {
          this.appState.selectedSessionId = id;
        }
        if (window.claude && window.claude.selectSession) {
          window.claude.selectSession(id);
        }
        this.updateSessionList(sessions);
      });
    }
  }

  async _refreshAotButton() {
    const isOnTop = await window.appWindow.isAlwaysOnTop();
    this.aotButton.textContent = `ALWAYS ON TOP: ${isOnTop ? 'ON' : 'OFF'}`;
    this.aotButton.style.background = isOnTop ? '#008751' : '#5f574f';
  }

  show() {
    this.visible = true;
    this._refreshAotButton();
    // Refresh session list on show
    if (this.appState?.availableSessions) {
      this.updateSessionList(this.appState.availableSessions);
    }
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.visible = false;
    this.overlay.classList.add('hidden');
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }
}

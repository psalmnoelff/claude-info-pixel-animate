// Settings overlay for launch configuration
class SettingsScreen {
  constructor(overlay, connector) {
    this.overlay = overlay;
    this.connector = connector;
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
      ">
        <h2 style="margin: 0 0 15px; color: #ffec27; font-size: 16px;">CLAUDE INFO - SETTINGS</h2>

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

        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <button id="si-launch" style="
            background: #008751; color: #fff1e8; border: none;
            padding: 8px 16px; font-family: monospace; font-size: 14px; cursor: pointer;
          ">LAUNCH</button>
          <button id="si-demo" style="
            background: #ab5236; color: #fff1e8; border: none;
            padding: 8px 16px; font-family: monospace; font-size: 14px; cursor: pointer;
          ">DEMO MODE</button>
          <button id="si-close" style="
            background: #5f574f; color: #fff1e8; border: none;
            padding: 8px 16px; font-family: monospace; font-size: 14px; cursor: pointer;
          ">CLOSE</button>
        </div>

        <p style="margin-top: 10px; color: #83769c; font-size: 11px;">
          Keys 0-5 = test states | ESC = settings | D = demo cycle
        </p>
      </div>
    `;

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
  }

  show() {
    this.visible = true;
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

// Status popup for displaying Claude incident details
class StatusPopup {
  constructor(overlay) {
    this.overlay = overlay;
    this.visible = false;
    this._onKeyDown = (e) => {
      if (e.key === 'Escape' && this.visible) {
        this.hide();
      }
    };
  }

  show(incidents) {
    this.visible = true;
    this._buildHTML(incidents);
    this.overlay.classList.remove('hidden');
    document.addEventListener('keydown', this._onKeyDown);
  }

  hide() {
    this.visible = false;
    this.overlay.classList.add('hidden');
    document.removeEventListener('keydown', this._onKeyDown);
  }

  updateIncidents(incidents) {
    if (this.visible) {
      this._buildHTML(incidents);
    }
  }

  _buildHTML(incidents) {
    let incidentHTML = '';
    if (!incidents || incidents.length === 0) {
      incidentHTML = '<p style="color: #c2c3c7;">No incident details available.</p>';
    } else {
      for (const inc of incidents) {
        incidentHTML += `
          <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #5f574f;">
            <div style="color: #ffa300; font-size: 13px; font-weight: bold; margin-bottom: 4px;">
              ${this._escapeHtml(inc.title || 'Untitled Incident')}
            </div>
            <div style="color: #83769c; font-size: 10px; margin-bottom: 6px;">
              ${this._escapeHtml(inc.pubDate || '')}
            </div>
            <div style="color: #c2c3c7; font-size: 11px; white-space: pre-wrap; line-height: 1.4;">
              ${this._escapeHtml(inc.description || 'No details.')}
            </div>
            ${inc.link ? `<a href="#" onclick="event.preventDefault();" style="color: #29adff; font-size: 10px; text-decoration: underline; cursor: default; pointer-events: none;">
              ${this._escapeHtml(inc.link)}
            </a>` : ''}
          </div>
        `;
      }
    }

    this.overlay.innerHTML = `
      <div style="
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: #1d2b53; border: 2px solid #ff004d;
        padding: 20px; color: #fff1e8;
        font-family: monospace; font-size: 14px;
        min-width: 380px; max-width: 500px;
        image-rendering: auto;
      ">
        <h2 style="margin: 0 0 12px; color: #ff004d; font-size: 15px;">CLAUDE STATUS INCIDENT</h2>
        <div style="max-height: 60vh; overflow-y: auto; padding-right: 6px;">
          ${incidentHTML}
        </div>
        <div style="margin-top: 12px; text-align: right;">
          <button id="status-popup-close" style="
            background: #5f574f; color: #fff1e8; border: none;
            padding: 8px 16px; font-family: monospace; font-size: 14px; cursor: pointer;
          ">CLOSE</button>
        </div>
      </div>
    `;

    this.overlay.querySelector('#status-popup-close').addEventListener('click', () => {
      this.hide();
    });
  }

  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

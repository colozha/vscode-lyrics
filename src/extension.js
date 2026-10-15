'use strict';
const vscode = require('vscode');
const { randomBytes } = require('node:crypto');
const { MediaMonitor } = require('./media');
const { LyricsClient } = require('./lyrics');
const { LyricsSession } = require('./session');

function activate(context) {
  const media = new MediaMonitor();
  const client = new LyricsClient();
  const session = new LyricsSession(client);
  media.on('update', state => session.updateMedia(state));
  media.on('problem', problem => {
    const detail = typeof problem === 'string' ? { message: problem, unsupported: false } : problem;
    Object.assign(session.state, { mediaError: detail.message, mediaUnsupported: detail.unsupported });
    session.publish();
  });
  let started = false;
  const provider = {
    resolveWebviewView(view) {
      const webview = view.webview;
      webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] };
      const nonce = randomBytes(16).toString('hex');
      const resource = name => webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', name));
      webview.html = `<!doctype html>
<html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${resource('sidebar.css')}"><title>Lyrics</title>
</head><body>
  <header>
    <div class="header-row">
      <div class="artwork" aria-hidden="true">
        <svg id="artwork-placeholder" viewBox="0 0 24 24"><path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/></svg>
        <img id="artwork" alt="" hidden>
      </div>
      <div class="track-copy"><h1 id="title">Waiting for a track</h1><p id="artist">Play music on your desktop or in a browser.</p><span id="live-badge" hidden>LIVE</span></div>
      <div class="header-actions">
        <button id="search-toggle" class="icon-button secondary" type="button" aria-label="Search" title="Search" aria-controls="search-panel" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg></button>
        <button id="refresh" class="icon-button secondary" type="button" aria-label="Refresh lyrics" title="Refresh lyrics"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4v6h-6M4 20v-6h6M5.2 8a7.5 7.5 0 0 1 12.3-2L20 10M4 14l2.5 4A7.5 7.5 0 0 0 18.8 16"/></svg></button>
      </div>
    </div>
    <div class="player-controls" role="group" aria-label="Player controls">
      <div class="transport-row">
        <button id="previous" class="transport secondary" type="button" aria-label="Previous track" title="Previous track" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v14M19 5v14L8 12z"/></svg></button>
        <button id="play-toggle" class="transport play-button" type="button" aria-label="Play" title="Play" disabled>
          <svg id="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          <svg id="pause-icon" viewBox="0 0 24 24" aria-hidden="true" hidden><path d="M8 6v12M16 6v12"/></svg>
        </button>
        <button id="next" class="transport secondary" type="button" aria-label="Next track" title="Next track" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v14M5 5v14l11-7z"/></svg></button>
      </div>
      <div class="seek-control">
        <input id="seek" type="range" min="0" max="0" value="0" step="1" aria-label="Seek position" disabled>
        <div id="playback-time" aria-label="Current position and duration"><span id="elapsed">0:00</span><span id="track-duration">0:00</span></div>
      </div>
    </div>
    <p id="control-error" role="status" hidden></p>
  </header>
  <section id="search-panel" class="search" aria-label="Manual lyrics search" hidden>
    <form id="search-form"><label for="query" class="sr-only">Search lyrics or artist</label><div class="search-row">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
      <input id="query" type="search" maxlength="200" placeholder="Search lyrics or artist…" required autocomplete="off">
      <button id="search-submit" type="submit" class="search-submit" aria-label="Search" title="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>
    </div></form><p id="search-status" role="status" hidden></p><div id="results" aria-label="Search results" hidden></div>
  </section>
  <aside id="media-problem" hidden><p id="media-error"></p><button id="reconnect" class="secondary" type="button">Reconnect</button></aside>
  <section class="lyric-section" aria-label="Lyrics">
    <div class="lyric-toolbar"><span id="lyric-type">Lyrics</span><button id="scroll-follow" class="secondary" type="button" hidden>Follow lyrics</button></div>
    <div id="lyrics" tabindex="0" aria-label="Lyrics text"><div id="notice" role="status"></div><div id="lines"></div></div>
  </section>
  <footer>
    <div class="footer-row"><label for="player">Player</label><select id="player"><option value="">Automatic</option></select><span id="playback-status" role="status"></span></div>
    <div class="footer-row footer-meta"><span id="mode">Automatic lyrics</span><button id="attribution" class="link" type="button">Lyrics by LRCLIB</button></div>
  </footer>
  <script nonce="${nonce}" src="${resource('sidebar.js')}"></script>
</body></html>`;
      const send = state => {
        // Position updates must not resend full lyric/search payloads each second.
        const { track, players, preferred, ...content } = state;
        const contentKey = JSON.stringify(content);
        const full = contentKey !== provider.lastContent;
        provider.lastContent = contentKey;
        void webview.postMessage({ type: 'state', state: full ? state : { track, players, preferred }, full });
      };
      provider.lastContent = '';
      session.on('update', send);
      const messages = webview.onDidReceiveMessage(message => {
        if (!message || typeof message !== 'object') return;
        switch (message.type) {
          case 'ready': provider.lastContent = ''; send(session.state); break;
          case 'search': if (typeof message.query === 'string' && message.query.trim().length && message.query.length <= 200) void session.search(message.query.trim()); break;
          case 'select': if (Number.isSafeInteger(message.id)) session.select(message.id); break;
          case 'player': if (typeof message.id === 'string' && (!message.id || media.players.has(message.id))) media.select(message.id); break;
          case 'refresh': void session.follow(); break;
          case 'reconnect': void media.reconnect(); break;
          case 'control': {
            const { action } = message;
            const value = action === 'seek' ? message.position : message.value;
            const valid = ['previous', 'playPause', 'next'].includes(action)
              || action === 'seek' && typeof value === 'number' && Number.isFinite(value);
            if (valid) void media.control(action, value).then(
              supported => webview.postMessage({ type: 'control-result', action, requestId: message.requestId, error: supported ? '' : 'This control is unavailable for the selected player.' }),
              () => webview.postMessage({ type: 'control-result', action, requestId: message.requestId, error: 'The player could not apply that change. Try again or choose another player.' })
            );
            break;
          }
          case 'attribution': void vscode.env.openExternal(vscode.Uri.parse(session.state.record?.source === 'lyrics.ovh' ? 'https://lyrics.ovh' : 'https://lrclib.net')); break;
        }
      });
      const visibility = view.onDidChangeVisibility(() => media.setVisible(view.visible));
      view.onDidDispose(() => { session.removeListener('update', send); messages.dispose(); visibility.dispose(); media.setVisible(false); });
      media.setVisible(view.visible);
      if (!started) { started = true; void media.start(); }
    }
  };
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('lyrics.sidebar', provider),
    vscode.commands.registerCommand('lyrics.focus', () => vscode.commands.executeCommand('lyrics.sidebar.focus')),
    { dispose() { media.dispose(); session.dispose(); client.dispose(); } }
  );
}
module.exports = { activate };

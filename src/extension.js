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
      webview.html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${resource('sidebar.css')}"><title>Lyrics</title></head><body>
      <header>
        <div class="header-row">
          <div class="track-copy"><h1 id="title">Waiting for a track</h1><p id="artist">Play music on your desktop or in a browser.</p></div>
          <div class="header-actions">
            <button id="search-toggle" class="icon-button secondary" type="button" aria-label="Search" title="Search" aria-controls="search-panel" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg></button>
            <button id="refresh" class="icon-button secondary" type="button" aria-label="Refresh lyrics" title="Refresh lyrics"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4.9 9a7.5 7.5 0 0 1 12.8-2L20 12M4 17v-5h5m10.1 3a7.5 7.5 0 0 1-12.8 2L4 12"/></svg></button>
          </div>
        </div>
        <div class="player-controls" aria-label="Player controls">
          <button id="previous" class="transport secondary" type="button" aria-label="Previous track" title="Previous track">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6zM20 6v12l-10-6z"/></svg>
          </button>
          <button id="play-toggle" class="transport secondary" type="button" aria-label="Play" title="Play">
            <svg id="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
            <svg id="pause-icon" viewBox="0 0 24 24" aria-hidden="true" hidden><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
          </button>
          <button id="next" class="transport secondary" type="button" aria-label="Next track" title="Next track">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6h2v12h-2zM4 6v12l10-6z"/></svg>
          </button>
          <input id="seek" type="range" min="0" max="0" value="0" step="1" aria-label="Seek position" disabled>
          <div id="playback-time" aria-label="Current position and duration"><span id="elapsed">0:00</span><span aria-hidden="true">/</span><span id="track-duration">0:00</span></div>
        </div>
      </header>
      <section id="search-panel" class="search" aria-label="Manual lyrics search" hidden><form id="search-form"><label for="query">Search lyrics</label><div class="search-row"><input id="query" type="search" maxlength="200" placeholder="Song title or artist" required autocomplete="off"><button id="search-submit" type="submit">Search</button></div></form><p id="search-status" role="status" hidden></p><div id="results" aria-label="Search results"></div></section>
      <aside id="media-problem" hidden><p id="media-error"></p><button id="reconnect" class="secondary" type="button">Reconnect</button></aside>
      <section class="lyric-section" aria-label="Lyrics"><div class="lyric-toolbar"><span id="lyric-type">Lyrics</span><button id="scroll-follow" class="secondary" type="button" hidden>Follow lyrics</button></div><div id="lyrics" tabindex="0" aria-label="Lyrics text"><div id="notice" role="status"></div><div id="lines"></div></div></section>
      <footer>
        <div class="footer-row"><label for="player">Player</label><select id="player"><option value="">Automatic</option></select><span id="playback-status" role="status"></span></div>
        <div class="footer-row footer-meta"><span id="mode">Automatic lyrics</span><button id="attribution" class="link" type="button">Lyrics by LRCLIB</button></div>
      </footer>
      <script nonce="${nonce}" src="${resource('sidebar.js')}"></script></body></html>`;
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
          case 'control':
            if (['previous', 'playPause', 'next'].includes(message.action)) void media.control(message.action).catch(() => {});
            else if (message.action === 'seek' && typeof message.position === 'number' && Number.isFinite(message.position)) void media.control('seek', message.position).catch(() => {});
            break;
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

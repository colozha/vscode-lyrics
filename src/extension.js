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
  media.on('problem', error => { session.state.mediaError = error; session.publish(); });
  let started = false;
  const provider = {
    resolveWebviewView(view) {
      const webview = view.webview;
      webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] };
      const nonce = randomBytes(16).toString('hex');
      const resource = name => webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', name));
      webview.html = `<!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${resource('sidebar.css')}"><title>Lyrics</title></head><body>
      <header><h1 id="title">Menunggu lagu</h1><p id="artist">Putar musik di desktop atau browser.</p><div class="source"><label for="player">Sumber</label><select id="player"><option value="">Otomatis</option></select><span id="playback"></span></div><button id="follow" class="secondary" hidden>Ikuti pemutar</button></header>
      <section class="search" aria-label="Pencarian manual"><form id="search-form"><label for="query">Cari lirik</label><div class="search-row"><input id="query" type="search" maxlength="200" placeholder="Judul lagu atau artis" required autocomplete="off"><button id="search-button" type="submit">Cari</button></div></form><p id="search-status" role="status" hidden></p><div id="results" aria-label="Hasil pencarian"></div></section>
      <aside id="media-problem" hidden><p id="media-error"></p><button id="reconnect" class="secondary">Sambungkan ulang</button></aside>
      <section class="lyric-section" aria-label="Lirik"><div class="lyric-toolbar"><span id="lyric-type">Lirik</span><button id="scroll-follow" class="secondary" hidden>Ikuti lirik</button></div><div id="lyrics" tabindex="0" aria-label="Teks lirik"><div id="notice" role="status"></div><div id="lines"></div><button id="retry" hidden>Coba lagi</button></div></section><footer><span id="mode">Otomatis</span><button id="attribution" class="link">Lirik dari LRCLIB</button></footer>
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
          case 'follow': case 'retry': void session.follow(); break;
          case 'reconnect': void media.reconnect(); break;
          case 'attribution': void vscode.env.openExternal(vscode.Uri.parse('https://lrclib.net')); break;
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

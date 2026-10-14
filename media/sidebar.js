'use strict';
const vscode = acquireVsCodeApi();
const $ = id => document.getElementById(id);
let state = {};
let rendered = '';
let lastActive = -2;
let followScroll = true;
let basePosition = 0;
let receivedAt = performance.now();
const send = (type, extra = {}) => vscode.postMessage({ type, ...extra });
const duration = seconds => `${Math.floor((seconds || 0) / 60)}:${String(Math.floor((seconds || 0) % 60)).padStart(2, '0')}`;
function text(id, value) { $(id).textContent = value; }

$('search-form').addEventListener('submit', event => { event.preventDefault(); send('search', { query: $('query').value }); });
$('player').addEventListener('change', () => send('player', { id: $('player').value }));
for (const id of ['follow', 'retry', 'reconnect', 'attribution']) $(id).addEventListener('click', () => send(id));
$('scroll-follow').addEventListener('click', () => { followScroll = true; lastActive = -2; updatePosition(); });
function stopFollowing() { if (state.mode === 'auto' && state.lines?.length) { followScroll = false; $('scroll-follow').hidden = false; } }
$('lyrics').addEventListener('wheel', stopFollowing, { passive: true });
$('lyrics').addEventListener('touchstart', stopFollowing, { passive: true });
$('lyrics').addEventListener('pointerdown', stopFollowing);
$('lyrics').addEventListener('keydown', event => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) stopFollowing(); });

window.addEventListener('message', event => {
  if (event.data?.type !== 'state') return;
  Object.assign(state, event.data.state);
  basePosition = state.track?.position || 0; receivedAt = performance.now();
  render(event.data.full);
});
function render(full) {
  const manual = state.mode === 'manual';
  const track = manual ? state.record : state.track;
  text('title', track?.trackName || track?.title || 'Menunggu lagu');
  text('artist', track?.artistName || track?.artist || 'Putar musik di desktop atau browser.');
  text('playback', manual ? '' : state.track?.status === 'Playing' ? 'Diputar' : state.track?.status === 'Paused' ? 'Dijeda' : '');
  const optionsKey = JSON.stringify([state.players?.map(p => [p.id, p.name]), state.preferred]);
  if ($('player').dataset.key !== optionsKey) {
    $('player').replaceChildren(new Option('Otomatis', ''), ...(state.players || []).map(p => new Option(p.name, p.id)));
    $('player').value = state.preferred || ''; $('player').dataset.key = optionsKey;
  }
  $('player').title = state.track?.name || 'Pilih sumber media';
  $('follow').hidden = !manual;
  text('mode', manual ? 'Pilihan manual' : 'Otomatis');
  $('media-problem').hidden = !state.mediaError;
  text('media-error', state.mediaError || '');
  if (full) {
    $('search-button').disabled = state.searching;
    text('search-button', state.searching ? 'Mencari…' : 'Cari');
    $('search-status').hidden = !state.searching && !state.searchError;
    text('search-status', state.searching ? 'Mencari lagu…' : state.searchError || '');
    const results = (state.results || []).map(record => {
      const button = document.createElement('button'); button.className = 'result';
      const title = document.createElement('strong'); title.textContent = record.trackName;
      const detail = document.createElement('span'); detail.textContent = `${record.artistName} · ${duration(record.duration)}${record.syncedLyrics ? ' · Sinkron' : ''}`;
      button.append(title, detail); button.addEventListener('click', () => send('select', { id: record.id })); return button;
    });
    $('results').replaceChildren(...results); $('results').hidden = !results.length;
  }
  const key = JSON.stringify([state.status, state.record?.id, state.mode, state.error]);
  if (rendered !== key) {
    rendered = key; lastActive = -2; followScroll = true; $('scroll-follow').hidden = true;
    $('lines').replaceChildren(); $('lyrics').scrollTop = 0;
    const messages = {
      waiting: 'Putar lagu untuk menemukan lirik secara otomatis, atau cari judul lagu di atas.',
      loading: 'Mencari lirik lagu…',
      missing: 'Lirik belum ditemukan. Coba cari judul lagu dan artis secara manual.',
      instrumental: 'Lagu ini ditandai sebagai instrumental.',
      error: state.error
    };
    text('notice', messages[state.status] || ''); $('notice').hidden = state.status === 'ready';
    $('lyrics').setAttribute('aria-busy', String(state.status === 'loading'));
    $('retry').hidden = !['error', 'missing'].includes(state.status) || manual;
    const synced = !manual && state.lines?.length;
    text('lyric-type', state.status === 'ready' ? synced ? 'Lirik sinkron' : 'Lirik teks' : 'Lirik');
    if (state.status === 'ready') {
      if (synced) {
        for (const line of state.lines) { const p = document.createElement('p'); p.className = 'line'; p.textContent = line.text || ' '; $('lines').append(p); }
      } else {
        const p = document.createElement('p'); p.className = 'plain';
        p.textContent = state.record.plainLyrics || state.lines.map(line => line.text).join('\n'); $('lines').append(p);
      }
    }
  }
  updatePosition();
}
function updatePosition() {
  if (state.mode !== 'auto' || state.status !== 'ready' || !state.lines?.length) return;
  const position = basePosition + (state.track?.status === 'Playing' ? (performance.now() - receivedAt) / 1000 * (state.track.rate ?? 1) : 0);
  let active = -1;
  for (let i = 0; i < state.lines.length && state.lines[i].time <= position; i++) active = i;
  $('scroll-follow').hidden = followScroll;
  if (active === lastActive) return;
  const elements = $('lines').children;
  if (elements[lastActive]) { elements[lastActive].classList.remove('active'); elements[lastActive].removeAttribute('aria-current'); }
  lastActive = active;
  const element = elements[active];
  if (element) {
    element.classList.add('active'); element.setAttribute('aria-current', 'true');
    if (followScroll) {
      const panel = $('lyrics');
      panel.scrollTo({ top: Math.max(0, element.offsetTop - panel.clientHeight * 0.35), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }
}
setInterval(() => { if (!document.hidden) updatePosition(); }, 200);
send('ready');

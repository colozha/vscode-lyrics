'use strict';
const vscode = acquireVsCodeApi();
const $ = id => document.getElementById(id);
let state = {};
let rendered = '';
let lastActive = -2;
let followScroll = true;
let basePosition = 0;
let receivedAt = performance.now();
let seeking = false;
let trackKey = '';
const send = (type, extra = {}) => vscode.postMessage({ type, ...extra });
const duration = seconds => `${Math.floor((seconds || 0) / 60)}:${String(Math.floor((seconds || 0) % 60)).padStart(2, '0')}`;
function text(id, value) { $(id).textContent = value; }

$('search-toggle').addEventListener('click', () => {
  const expanded = $('search-panel').hidden;
  $('search-panel').hidden = !expanded;
  $('search-toggle').setAttribute('aria-expanded', String(expanded));
  const label = expanded ? 'Hide search' : 'Search';
  $('search-toggle').setAttribute('aria-label', label);
  $('search-toggle').title = label;
  if (expanded) $('query').focus();
});
$('search-form').addEventListener('submit', event => { event.preventDefault(); send('search', { query: $('query').value }); });
$('player').addEventListener('change', () => send('player', { id: $('player').value }));
for (const id of ['refresh', 'reconnect', 'attribution']) $(id).addEventListener('click', () => send(id));
for (const [id, action] of [['previous', 'previous'], ['play-toggle', 'playPause'], ['next', 'next']]) {
  $(id).addEventListener('click', () => send('control', { action }));
}
$('seek').addEventListener('input', () => {
  seeking = true;
  text('elapsed', duration(Number($('seek').value)));
});
$('seek').addEventListener('change', () => {
  const position = Number($('seek').value);
  if (Number.isFinite(position)) {
    basePosition = position; receivedAt = performance.now();
    send('control', { action: 'seek', position });
  }
  seeking = false;
});
$('seek').addEventListener('pointercancel', () => { seeking = false; });
$('scroll-follow').addEventListener('click', () => { followScroll = true; lastActive = -2; updatePosition(); });
function stopFollowing() { if (state.mode === 'auto' && state.lines?.length) { followScroll = false; $('scroll-follow').hidden = false; } }
$('lyrics').addEventListener('wheel', stopFollowing, { passive: true });
$('lyrics').addEventListener('touchstart', stopFollowing, { passive: true });
$('lyrics').addEventListener('pointerdown', stopFollowing);
$('lyrics').addEventListener('keydown', event => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) stopFollowing(); });

window.addEventListener('message', event => {
  if (event.data?.type !== 'state') return;
  const incomingTrackKey = JSON.stringify([event.data.state.track?.id, event.data.state.track?.trackId]);
  if (incomingTrackKey !== trackKey) seeking = false;
  trackKey = incomingTrackKey;
  Object.assign(state, event.data.state);
  basePosition = state.track?.position || 0; receivedAt = performance.now();
  render(event.data.full);
});
function render(full) {
  const manual = state.mode === 'manual';
  const track = manual ? state.record : state.track;
  text('title', track?.trackName || track?.title || 'Waiting for a track');
  text('artist', track?.artistName || track?.artist || 'Play music on your desktop or in a browser.');
  const optionsKey = JSON.stringify([state.players?.map(p => [p.id, p.name]), state.preferred, state.mediaUnsupported]);
  if ($('player').dataset.key !== optionsKey) {
    $('player').replaceChildren(new Option(state.mediaUnsupported ? 'Unavailable' : 'Automatic', ''), ...(state.players || []).map(p => new Option(p.name, p.id)));
    $('player').value = state.preferred || ''; $('player').dataset.key = optionsKey;
  }
  $('player').disabled = Boolean(state.mediaUnsupported);
  $('player').title = state.track?.name || 'Choose a media source';
  const playerStatus = state.mediaUnsupported ? state.mediaError : state.track
    ? (state.track.status === 'Playing' ? 'Playing' : state.track.status === 'Paused' ? 'Paused' : 'Stopped') + (state.track.name ? ' · ' + state.track.name : '')
    : 'No player detected';
  text('playback-status', playerStatus);
  $('refresh').disabled = !state.track?.title;
  text('mode', manual ? 'Manual lyrics' : 'Automatic lyrics');
  $('media-problem').hidden = !state.mediaError || Boolean(state.mediaUnsupported);
  text('media-error', state.mediaError || '');
  if (full) {
    $('search-submit').disabled = state.searching;
    text('search-submit', state.searching ? 'Searching…' : 'Search');
    $('search-status').hidden = !state.searching && !state.searchError;
    text('search-status', state.searching ? 'Searching for lyrics…' : state.searchError || '');
    const results = (state.results || []).map(record => {
      const button = document.createElement('button'); button.className = 'result';
      const title = document.createElement('strong'); title.textContent = record.trackName;
      const detail = document.createElement('span'); detail.textContent = record.artistName + ' · ' + duration(record.duration) + (record.syncedLyrics ? ' · Synced' : '');
      button.append(title, detail); button.addEventListener('click', () => send('select', { id: record.id })); return button;
    });
    $('results').replaceChildren(...results); $('results').hidden = !results.length;
  }
  const key = JSON.stringify([state.status, state.record?.id, state.mode, state.error]);
  if (rendered !== key) {
    rendered = key; lastActive = -2; followScroll = true; $('scroll-follow').hidden = true;
    $('lines').replaceChildren(); $('lyrics').scrollTop = 0;
    const messages = {
      waiting: state.mediaUnsupported ? 'Search for a song to view its lyrics.' : 'Play a track to find lyrics automatically, or search by title or artist.',
      loading: 'Searching for lyrics…',
      missing: 'Lyrics not found. Search by song title and artist.',
      instrumental: 'This track is marked as instrumental.',
      error: state.error
    };
    text('notice', messages[state.status] || ''); $('notice').hidden = state.status === 'ready';
    $('lyrics').setAttribute('aria-busy', String(state.status === 'loading'));
    const synced = !manual && state.lines?.length;
    text('lyric-type', state.status === 'ready' ? synced ? 'Synced lyrics' : 'Plain lyrics' : 'Lyrics');
    if (state.status === 'ready') {
      if (synced) {
        for (const line of state.lines) { const p = document.createElement('p'); p.className = 'line'; p.textContent = line.text || ' '; $('lines').append(p); }
      } else {
        const p = document.createElement('p'); p.className = 'plain';
        p.textContent = state.record.plainLyrics || state.lines.map(line => line.text).join('\n'); $('lines').append(p);
      }
    }
  }
  updatePlaybackControls();
  updatePosition();
}
function currentPosition() {
  const track = state.track;
  if (!track) return 0;
  const elapsed = track.status === 'Playing' ? Math.max(0, (performance.now() - receivedAt) / 1000 * (track.rate ?? 1)) : 0;
  return track.duration > 0 ? Math.min(track.duration, basePosition + elapsed) : basePosition + elapsed;
}
function updatePlaybackControls() {
  const track = state.track;
  const capabilities = track?.capabilities || {};
  $('previous').disabled = !capabilities.previous;
  $('play-toggle').disabled = !capabilities.playPause;
  $('next').disabled = !capabilities.next;
  $('seek').disabled = !capabilities.seek;
  const playing = track?.status === 'Playing';
  $('play-toggle').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  $('play-toggle').title = playing ? 'Pause' : 'Play';
  $('play-icon').hidden = playing;
  $('pause-icon').hidden = !playing;
  const length = Math.max(0, track?.duration || 0);
  $('seek').max = String(length);
  if (!seeking) $('seek').value = String(Math.min(length, currentPosition()));
  text('elapsed', duration(currentPosition()));
  text('track-duration', duration(length));
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
setInterval(() => { if (!document.hidden) { updatePlaybackControls(); updatePosition(); } }, 200);
send('ready');

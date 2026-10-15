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
let artworkSource = '';
let controlId = 0;
const pendingControls = new Map();
const send = (type, extra = {}) => vscode.postMessage({ type, ...extra });
const duration = seconds => `${Math.floor((seconds || 0) / 60)}:${String(Math.floor((seconds || 0) % 60)).padStart(2, '0')}`;
function text(id, value) { $(id).textContent = value; }
function control(action, extra = {}) {
  if (pendingControls.has(action)) return;
  const requestId = ++controlId;
  pendingControls.set(action, requestId);
  $('control-error').hidden = true;
  send('control', { action, requestId, ...extra });
  updatePlaybackControls();
}

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
  $(id).addEventListener('click', () => control(action));
}
$('artwork').addEventListener('error', () => {
  $('artwork').hidden = true; $('artwork-placeholder').removeAttribute('hidden');
});
$('seek').addEventListener('input', () => {
  seeking = true;
  text('elapsed', duration(Number($('seek').value)));
});
$('seek').addEventListener('change', () => {
  const position = Number($('seek').value);
  if (Number.isFinite(position)) {
    basePosition = position; receivedAt = performance.now();
    control('seek', { position });
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
  if (event.data?.type === 'control-result') {
    if (pendingControls.get(event.data.action) !== event.data.requestId) return;
    pendingControls.delete(event.data.action);
    text('control-error', event.data.error || ''); $('control-error').hidden = !event.data.error;
    updatePlaybackControls(); return;
  }
  if (event.data?.type !== 'state') return;
  const incomingTrackKey = JSON.stringify([event.data.state.track?.id, event.data.state.track?.trackId, event.data.state.track?.title]);
  if (incomingTrackKey !== trackKey) {
    seeking = false; pendingControls.clear();
    $('control-error').hidden = true;
  }
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
  const title = track?.trackName || track?.title || '';
  const album = track?.albumName || track?.album || '';
  const liveVersion = /[\[(]live(?:\s+(?:at|in|from|version|recording|performance)\b[^)\]]*)?[)\]]|\s[-–—]\s*live(?:\s+(?:at|in|from|version|recording|performance)\b.*)?$/i;
  $('live-badge').hidden = !(liveVersion.test(title.trim()) || liveVersion.test(album.trim()) || /^live(?:\s+(?:at|in|from|version|recording|performance)\b.*)?$/i.test(album.trim()));
  const artwork = manual ? '' : state.artwork || '';
  if (artworkSource !== artwork) {
    artworkSource = artwork;
    $('artwork').hidden = !artwork; $('artwork-placeholder').toggleAttribute('hidden', Boolean(artwork));
    if (artwork) $('artwork').src = artwork;
    else $('artwork').removeAttribute('src');
  }
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
  const lyricsOvh = state.record?.source === 'lyrics.ovh';
  text('attribution', lyricsOvh ? 'Lyrics by lyrics.ovh' : 'Lyrics by LRCLIB');
  $('attribution').title = lyricsOvh ? 'Open lyrics.ovh' : 'Open LRCLIB';
  $('media-problem').hidden = !state.mediaError || Boolean(state.mediaUnsupported);
  text('media-error', state.mediaError || '');
  if (full) {
    $('search-submit').disabled = state.searching;
    $('search-submit').setAttribute('aria-label', state.searching ? 'Searching…' : 'Search');
    $('search-form').setAttribute('aria-busy', String(Boolean(state.searching)));
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
  const key = JSON.stringify([state.status, state.record?.id, state.record?.trackName, state.record?.artistName, state.record?.source, state.mode, state.error]);
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
    $('notice').classList.toggle('loading', state.status === 'loading');
    const synced = Boolean(state.lines?.length);
    text('lyric-type', state.status === 'ready' ? synced ? manual ? 'Timestamped lyrics · Manual' : 'Synced lyrics' : 'Plain lyrics' : 'Lyrics');
    if (state.status === 'ready') {
      if (synced) {
        for (const line of state.lines) {
          const group = document.createElement('div'); group.className = 'line-group';
          if (line.section) {
            const heading = document.createElement('p'); heading.className = 'section-label'; heading.textContent = `[${line.section}]`; group.append(heading);
          }
          const p = document.createElement('p'); p.className = 'line';
          const time = document.createElement('time'); time.className = 'line-time';
          time.dateTime = `PT${Math.max(0, line.time)}S`; time.textContent = duration(Math.max(0, line.time)).padStart(5, '0');
          const lyric = document.createElement('span'); lyric.textContent = line.text || '\u00a0';
          p.append(time, lyric); group.append(p); $('lines').append(group);
        }
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
  for (const [id, action] of [['previous', 'previous'], ['play-toggle', 'playPause'], ['next', 'next'], ['seek', 'seek']]) {
    $(id).disabled = !capabilities[action] || pendingControls.has(action);
  }
  const playing = track?.status === 'Playing';
  $('play-toggle').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  $('play-toggle').title = playing ? 'Pause' : 'Play';
  $('play-icon').toggleAttribute('hidden', playing);
  $('pause-icon').toggleAttribute('hidden', !playing);
  const length = Math.max(0, track?.duration || 0);
  $('seek').max = String(length);
  if (!seeking) $('seek').value = String(Math.min(length, currentPosition()));
  if (!seeking) text('elapsed', duration(currentPosition()));
  text('track-duration', duration(length));
}
function updatePosition() {
  if (state.mode !== 'auto' || state.status !== 'ready' || !state.lines?.length) return;
  const position = basePosition + (state.track?.status === 'Playing' ? (performance.now() - receivedAt) / 1000 * (state.track.rate ?? 1) : 0);
  let active = -1;
  for (let i = 0; i < state.lines.length && state.lines[i].time <= position; i++) active = i;
  $('scroll-follow').hidden = followScroll;
  if (active === lastActive) return;
  const elements = $('lines').querySelectorAll('.line');
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

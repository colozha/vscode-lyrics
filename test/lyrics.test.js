'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseLrc, activeLine, cleanTitle, pickMatch, LyricsClient } = require('../src/lyrics');
const { MediaMonitor, seconds, snapshot, choosePlayer } = require('../src/media');
const { LyricsSession } = require('../src/session');
const tick = () => new Promise(resolve => setImmediate(resolve));
const track = { id: 'brave', trackId: '/1', title: 'One More Light', artist: 'Linkin Park', duration: 270 };
const record = { id: 1, trackName: track.title, artistName: track.artist, duration: 270, syncedLyrics: '[00:01.00]First\n[00:02.00]Second', plainLyrics: 'First\nSecond' };

test('LRC supports repeated stamps, fractions, CRLF, offsets, blank lines and malformed metadata', () => {
  const lines = parseLrc('[ar:Artist]\r\n[offset:100]\r\n[00:02.5][01:02.050]Later\n[00:01.00]First\n[00:03]\n[00:99]Bad');
  assert.deepEqual(lines, [{ time: .9, text: 'First' }, { time: 2.4, text: 'Later' }, { time: 2.9, text: '' }, { time: 61.949999999999996, text: 'Later' }]);
  assert.equal(activeLine(lines, .2), -1); assert.equal(activeLine(lines, 2.4), 1); assert.equal(activeLine(lines, 62), 3);
  assert.deepEqual(parseLrc('Just plain text'), []);
});
test('Browser title cleanup preserves live/remix versions', () => {
  assert.equal(cleanTitle('One More Light [Official Music Video] - Linkin Park', 'Linkin Park'), 'One More Light');
  assert.equal(cleanTitle('Linkin Park - One More Light (Live)', 'Linkin Park'), 'One More Light (Live)');
  assert.equal(cleanTitle('Song (Remix) [Official Audio]'), 'Song (Remix)');
  assert.equal(cleanTitle('Heavy [Official Music Video] - Linkin Park (feat. Kiiara)', 'Linkin Park'), 'Heavy');
});
test('Match requires title/artist and respects duration', () => {
  assert.equal(pickMatch([{ ...record, id: 2, duration: 400 }, record], track), record);
  assert.equal(pickMatch([{ ...record, artistName: 'Someone else' }], track), null);
  assert.equal(pickMatch([{ ...record, trackName: 'One More Light (Live)' }], track), null);
});
test('D-Bus variants, microseconds, and control capabilities become JSON-safe snapshots', () => {
  const v = value => ({ value });
  assert.equal(seconds(v(12345000n)), 12.345);
  assert.equal(seconds(undefined), 0);
  const data = snapshot('org.mpris.MediaPlayer2.brave', {
    Metadata: v({ 'mpris:trackid': v('/track/1'), 'xesam:title': v('Song'), 'xesam:artist': v(['A', 'B']), 'mpris:length': v(10000000n) }),
    Position: v(5000000n), PlaybackStatus: v('Playing'), CanControl: v(true),
    CanGoPrevious: v(false), CanPlay: v(true), CanPause: v(true), CanGoNext: v(true), CanSeek: v(true)
  });
  assert.equal(data.artist, 'A, B'); assert.equal(data.position, 5); assert.equal(data.duration, 10); assert.doesNotThrow(() => JSON.stringify(data));
  assert.deepEqual(data.capabilities, { previous: false, playPause: true, next: true, seek: true });
  assert.deepEqual(snapshot('org.mpris.MediaPlayer2.brave', {}).capabilities, { previous: false, playPause: false, next: false, seek: false });
});
test('Select playing source, retain active source, honor explicit selection, recover when removed', () => {
  const players = [{ id: 'a', status: 'Paused' }, { id: 'b', status: 'Playing' }, { id: 'c', status: 'Playing' }];
  assert.equal(choosePlayer(players, 'a'), 'b'); assert.equal(choosePlayer(players, 'c'), 'c');
  assert.equal(choosePlayer(players, 'b', 'a'), 'a'); assert.equal(choosePlayer(players, 'a', 'missing'), 'b');
  assert.equal(choosePlayer([], 'a'), '');
});
test('MPRIS actions call the supported transport methods and clamp seek to track duration', async () => {
  const calls = [];
  const monitor = new MediaMonitor();
  const entry = {
    values: {
      Metadata: { 'mpris:trackid': '/track/1', 'mpris:length': 20000000n },
      CanControl: true, CanGoPrevious: true, CanPlay: true, CanPause: true, CanGoNext: true, CanSeek: true
    },
    player: {
      Previous: async () => calls.push(['previous']),
      PlayPause: async () => calls.push(['playPause']),
      Next: async () => calls.push(['next']),
      SetPosition: async (...args) => calls.push(['seek', ...args])
    }
  };
  monitor.selected = 'org.mpris.MediaPlayer2.test';
  monitor.players.set(monitor.selected, entry);
  assert.equal(await new MediaMonitor().control('previous'), false);
  assert.equal(await monitor.control('previous'), true);
  assert.equal(await monitor.control('playPause'), true);
  assert.equal(await monitor.control('next'), true);
  assert.equal(await monitor.control('seek', 30), true);
  assert.equal(await monitor.control('unknown'), false);
  assert.deepEqual(calls, [
    ['previous'], ['playPause'], ['next'], ['seek', '/track/1', 20000000n]
  ]);
  entry.values.CanGoNext = false;
  assert.equal(await monitor.control('next'), false);
  assert.equal(calls.length, 4);
});
test('MPRIS polling refreshes PlaybackStatus without a change signal', async () => {
  let status = { value: 'Paused' };
  const monitor = new MediaMonitor();
  const entry = {
    values: { PlaybackStatus: { value: 'Stopped' } },
    properties: { Get: async (_iface, property) => {
      if (property === 'PlaybackStatus') return status;
      throw new Error('Position unavailable');
    } }
  };
  monitor.selected = 'org.mpris.MediaPlayer2.test';
  monitor.players.set(monitor.selected, entry);
  const states = [];
  monitor.on('update', ({ track }) => states.push(track.status));

  await monitor.pollPosition();
  assert.equal(states.at(-1), 'Paused');
  status = { value: 'Playing' };
  await monitor.pollPosition();
  assert.equal(states.at(-1), 'Playing');
});
test('HTTP exact lookup falls back to search, caches, and reports invalid/error responses', async () => {
  const urls = [];
  const client = new LyricsClient(async url => { urls.push(url); return url.includes('/get?') ? { status: 404 } : { status: 200, ok: true, json: async () => [record] }; });
  assert.equal((await client.find(track)).id, 1);
  assert.equal((await client.find(track)).id, 1);
  assert.equal(urls.filter(url => url.includes('/search?')).length, 1);
  await assert.rejects(() => new LyricsClient(async () => ({ status: 429 })).search('x'), /Too many requests/);
  await assert.rejects(() => new LyricsClient(async () => ({ status: 200, ok: true, json: async () => ({ bad: true }) })).search('x'), /invalid response/);
});
test('Stale lyric response cannot replace new song; manual returns to auto only on song change', async () => {
  const pending = [];
  const session = new LyricsSession({ find: () => new Promise(resolve => pending.push(resolve)) });
  session.updateMedia({ track, players: [track], preferred: '' });
  session.updateMedia({ track: { ...track, title: 'Next', trackId: '/2' }, players: [], preferred: '' });
  pending[1]({ ...record, id: 2, trackName: 'Next' }); await tick();
  pending[0](record); await tick();
  assert.equal(session.state.record.id, 2);
  session.state.results = [record]; session.select(1);
  assert.equal(session.state.mode, 'manual');
  session.updateMedia({ track: { ...session.state.track, position: 50, status: 'Paused' }, players: [], preferred: '' });
  assert.equal(session.state.mode, 'manual');
  session.updateMedia({ track: { ...track, trackId: '/3' }, players: [], preferred: '' });
  assert.equal(session.state.mode, 'auto'); assert.equal(session.state.status, 'loading');
  session.dispose();
});
test('Late automatic response cannot overwrite manual choice and empty media clears state', async () => {
  let resolve;
  const session = new LyricsSession({ find: () => new Promise(done => { resolve = done; }) });
  session.updateMedia({ track, players: [], preferred: '' });
  session.state.results = [record]; session.select(1); resolve({ ...record, id: 2 }); await tick();
  assert.equal(session.state.record.id, 1); assert.equal(session.state.mode, 'manual');
  session.updateMedia({ track: null, players: [], preferred: '' });
  assert.equal(session.state.status, 'waiting'); assert.equal(session.state.record, null); session.dispose();
});
test('Refresh returns a manual lyric selection to the active player', async () => {
  const session = new LyricsSession({ find: async track => ({ ...record, trackName: track.title }) });
  session.state.track = { ...track };
  session.state.results = [record];
  session.select(record.id);
  assert.equal(session.state.mode, 'manual');
  await session.follow();
  assert.equal(session.state.mode, 'auto');
  assert.equal(session.state.record.trackName, track.title);
  session.dispose();
});
test('Manual searches discard old results and handle network errors', async () => {
  const pending = [];
  const session = new LyricsSession({ search: () => new Promise(resolve => pending.push(resolve)) });
  const first = session.search('first'); const second = session.search('second');
  pending[1]([record]); await second; pending[0]([]); await first;
  assert.equal(session.state.results[0].id, 1); assert.equal(session.state.searching, false);
  session.client.search = async () => { throw new Error('offline'); };
  await session.search('third'); assert.match(session.state.searchError, /failed/); session.dispose();
});

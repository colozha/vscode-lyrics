'use strict';

const BASE = 'https://lrclib.net/api';

function cleanTitle(title, artist = '') {
  let result = String(title || '').replace(/\s*[\[(](?:official\s+)?(?:music\s+)?(?:video|audio|lyric(?:s| video)?|visuali[sz]er)(?:\s+official)?[\])]\s*/gi, ' ')
    .replace(/\s*[-|]\s*(?:official\s+)?(?:music\s+)?(?:video|audio|lyrics)\s*$/i, '').trim();
  if (artist) {
    for (const separator of [' - ', ' – ', ' — ']) {
      const suffixAt = result.toLowerCase().lastIndexOf(separator + artist.toLowerCase());
      if (suffixAt >= 0) {
        const tail = result.slice(suffixAt + separator.length + artist.length).trim();
        if (!tail || /^[\[(](?:feat\.?|ft\.?)\s.+[\])]$/i.test(tail)) result = result.slice(0, suffixAt).trim();
      }
      if (result.toLowerCase().startsWith(artist.toLowerCase() + separator)) result = result.slice(artist.length + separator.length).trim();
    }
  }
  return result.replace(/\s+/g, ' ');
}

function parseLrc(text = '') {
  const lines = [];
  for (const line of text.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    const content = line.replace(/\[\d+:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    for (const stamp of stamps) {
      if (Number(stamp[2]) >= 60) continue;
      lines.push({ time: Number(stamp[1]) * 60 + Number(stamp[2]) + Number('0.' + (stamp[3] || '0')), text: content });
    }
  }
  const offset = text.match(/\[offset:([+-]?\d+)\]/i);
  // LRC positive offset advances the lyric relative to the recording.
  if (offset) for (const line of lines) line.time -= Number(offset[1]) / 1000;
  return lines.sort((a, b) => a.time - b.time);
}

function activeLine(lines, position) {
  let index = -1;
  for (let i = 0; i < lines.length && lines[i].time <= position; i++) index = i;
  return index;
}

const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function pickMatch(results, track) {
  const title = normalize(cleanTitle(track.title, track.artist));
  const artist = normalize(track.artist);
  return results.filter(item => normalize(item.trackName) === title && (!artist || normalize(item.artistName) === artist))
    .filter(item => !track.duration || Math.abs(item.duration - track.duration) <= 8)
    .sort((a, b) => (track.duration ? Math.abs(a.duration - track.duration) - Math.abs(b.duration - track.duration) : 0) || Number(Boolean(b.syncedLyrics)) - Number(Boolean(a.syncedLyrics)))[0] || null;
}

class LyricsClient {
  constructor(fetcher) {
    this.fetcher = fetcher; this.cache = new Map();
    if (!fetcher) {
      const { Agent, fetch: request } = require('undici');
      this.fetcher = request;
      this.dispatcher = new Agent({ connect: { autoSelectFamily: true, autoSelectFamilyAttemptTimeout: 3000 } });
    }
  }
  dispose() { void this.dispatcher?.close(); }
  async request(path, params, signal) {
    const url = `${BASE}/${path}?${new URLSearchParams(params)}`;
    if (this.cache.has(url)) return this.cache.get(url);
    const response = await this.fetcher(url, {
      headers: { 'User-Agent': 'VSCodeLyrics/0.1.0' },
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000)
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests. Wait a moment, then try again.' : `Lyrics service error (HTTP ${response.status}).`);
    const data = await response.json();
    if (path === 'search' ? !Array.isArray(data) || !data.every(validRecord) : !validRecord(data)) throw new Error('The lyrics service returned an invalid response.');
    this.cache.set(url, data);
    if (this.cache.size > 100) this.cache.delete(this.cache.keys().next().value);
    return data;
  }
  async search(query, signal) { return await this.request('search', { q: query }, signal) || []; }
  async find(track, signal) {
    const title = cleanTitle(track.title, track.artist);
    if (!title) return null;
    if (track.artist && track.duration) {
      const exact = await this.request('get', { track_name: title, artist_name: track.artist, album_name: track.album || '', duration: Math.round(track.duration) }, signal);
      if (exact) return exact;
    }
    const results = await this.request('search', { track_name: title, ...(track.artist ? { artist_name: track.artist } : {}) }, signal) || [];
    return pickMatch(results, track);
  }
}
function validRecord(value) {
  return value && Number.isSafeInteger(value.id) && typeof value.trackName === 'string' && typeof value.artistName === 'string'
    && Number.isFinite(value.duration) && [value.plainLyrics, value.syncedLyrics].every(text => text == null || typeof text === 'string');
}
module.exports = { LyricsClient, cleanTitle, parseLrc, activeLine, pickMatch };

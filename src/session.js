'use strict';
const { EventEmitter } = require('node:events');
const { parseLrc } = require('./lyrics');
const { loadArtwork } = require('./artwork');
const identity = track => track ? [track.id, track.trackId, track.title, track.artist, track.album, track.duration].join('\u0000') : '';

class LyricsSession extends EventEmitter {
  constructor(client, artworkLoader = loadArtwork) {
    super(); this.client = client; this.generation = 0; this.artworkLoader = artworkLoader; this.artworkKey = '';
    this.state = { track: null, players: [], preferred: '', artwork: '', mode: 'auto', status: 'waiting', record: null, lines: [], results: [], searching: false, searchError: '', mediaError: '', mediaUnsupported: false, error: '' };
  }
  publish() { this.emit('update', this.state); }
  updateMedia({ track, players, preferred }) {
    const changed = identity(track) !== identity(this.state.track);
    Object.assign(this.state, { track, players, preferred });
    this.updateArtwork(track);
    if (changed) {
      if (track?.title) void this.follow();
      else {
        this.cancel();
        Object.assign(this.state, { mode: 'auto', status: 'waiting', record: null, lines: [], error: '' });
        this.publish();
      }
    } else this.publish();
  }
  updateArtwork(track) {
    const key = JSON.stringify([identity(track), track?.artUrl]);
    if (key === this.artworkKey) return;
    this.artworkKey = key;
    this.artworkController?.abort();
    this.state.artwork = '';
    if (!track?.artUrl) return;
    const controller = this.artworkController = new AbortController();
    void this.artworkLoader(track.artUrl, controller.signal).then(artwork => {
      if (controller.signal.aborted || this.artworkKey !== key || !artwork) return;
      this.state.artwork = artwork; this.publish();
    }).catch(() => { /* Artwork is optional; lyrics and playback remain available. */ });
  }
  cancel() { this.controller?.abort(); this.generation++; }
  setRecord(record) {
    const lines = parseLrc(record?.syncedLyrics || '');
    Object.assign(this.state, { record, lines, status: record?.instrumental ? 'instrumental' : lines.length || record?.plainLyrics?.trim() ? 'ready' : 'missing', error: '' });
  }
  async follow() {
    this.cancel();
    this.state.mode = 'auto';
    const track = this.state.track;
    if (!track?.title) { this.setRecord(null); this.state.status = 'waiting'; this.publish(); return; }
    const generation = this.generation;
    this.controller = new AbortController();
    Object.assign(this.state, { status: 'loading', record: null, lines: [], error: '' }); this.publish();
    try {
      const record = await this.client.find(track, this.controller.signal);
      if (generation !== this.generation) return;
      this.setRecord(record);
    } catch (error) {
      if (generation !== this.generation) return;
      Object.assign(this.state, { status: 'error', error: error.name === 'TimeoutError' ? 'Lyrics search timed out. Check your connection and try again.' : 'Lyrics could not be loaded. ' + error.message });
    }
    this.publish();
  }
  async search(query) {
    this.searchController?.abort();
    const controller = this.searchController = new AbortController();
    Object.assign(this.state, { searching: true, searchError: '', results: [] }); this.publish();
    try {
      const results = await this.client.search(query, controller.signal);
      if (controller !== this.searchController) return;
      this.state.results = results;
      if (!results.length) this.state.searchError = 'No results. Try the song title and artist.';
    } catch (error) {
      if (controller !== this.searchController) return;
      this.state.searchError = 'Search failed. Check your connection and try again.';
    }
    this.state.searching = false; this.publish();
  }
  select(id) {
    const record = this.state.results.find(item => item.id === id);
    if (!record) return;
    this.cancel(); this.state.mode = 'manual'; this.setRecord(record);
    this.state.results = []; this.state.searchError = ''; this.publish();
  }
  dispose() { this.cancel(); this.searchController?.abort(); this.artworkController?.abort(); this.removeAllListeners(); }
}
module.exports = { LyricsSession, identity };

'use strict';
const { EventEmitter } = require('node:events');
const PREFIX = 'org.mpris.MediaPlayer2.';
const PLAYER = 'org.mpris.MediaPlayer2.Player';
// Chromium can expose MPRIS methods while returning an empty introspection node.
const MPRIS_XML = `<node>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="GetAll"><arg type="s" direction="in"/><arg type="a{sv}" direction="out"/></method>
    <method name="Get"><arg type="s" direction="in"/><arg type="s" direction="in"/><arg type="v" direction="out"/></method>
    <signal name="PropertiesChanged"><arg type="s"/><arg type="a{sv}"/><arg type="as"/></signal>
  </interface>
  <interface name="org.mpris.MediaPlayer2.Player">
    <method name="Next"/>
    <method name="Previous"/>
    <method name="PlayPause"/>
    <method name="Seek"><arg type="x" direction="in"/></method>
    <method name="SetPosition"><arg type="o" direction="in"/><arg type="x" direction="in"/></method>
    <signal name="Seeked"><arg type="x"/></signal>
  </interface>
</node>`;
const unwrap = value => value && typeof value === 'object' && 'value' in value ? unwrap(value.value) : value;
const flag = value => unwrap(value) === true;
const seconds = value => { const number = Number(unwrap(value)); return Number.isFinite(number) ? Math.max(0, number / 1e6) : 0; };

function snapshot(name, properties) {
  const metadata = unwrap(properties.Metadata) || {};
  const trackId = String(unwrap(metadata['mpris:trackid']) || '');
  const duration = seconds(metadata['mpris:length']);
  const canControl = flag(properties.CanControl);
  return {
    id: name, name: name.slice(PREFIX.length),
    trackId,
    title: String(unwrap(metadata['xesam:title']) || ''),
    artist: Array.isArray(unwrap(metadata['xesam:artist'])) ? unwrap(metadata['xesam:artist']).map(String).join(', ') : String(unwrap(metadata['xesam:artist']) || ''),
    album: String(unwrap(metadata['xesam:album']) || ''),
    duration, position: seconds(properties.Position),
    status: unwrap(properties.PlaybackStatus) || 'Stopped',
    rate: Number(unwrap(properties.Rate) ?? 1),
    capabilities: {
      previous: canControl && flag(properties.CanGoPrevious),
      playPause: canControl && (flag(properties.CanPlay) || flag(properties.CanPause)),
      next: canControl && flag(properties.CanGoNext),
      seek: canControl && flag(properties.CanSeek) && duration > 0 && Boolean(trackId)
    }
  };
}
function choosePlayer(players, currentId, preferredId = '') {
  if (preferredId && players.some(p => p.id === preferredId)) return preferredId;
  const playing = players.filter(p => p.status === 'Playing');
  return (playing.find(p => p.id === currentId) || playing[0] || players.find(p => p.id === currentId) || players[0])?.id || '';
}

class MediaMonitor extends EventEmitter {
  constructor() { super(); this.players = new Map(); this.selected = ''; this.preferred = ''; this.disposed = false; this.visible = false; this.discovery = new Map(); }
  async start() {
    if (process.platform !== 'linux') {
      this.emit('problem', { message: 'Automatic player detection is unavailable on this OS. Use Search to find lyrics manually.', unsupported: true });
      return;
    }
    try {
      const dbus = require('dbus-next');
      this.bus = dbus.sessionBus();
      const connection = this.bus;
      this.bus.on('error', () => { if (this.bus === connection) this.fail(); });
      const proxy = await this.bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
      if (this.disposed || this.bus !== connection) return;
      this.daemon = proxy.getInterface('org.freedesktop.DBus');
      this.ownerChanged = (name, oldOwner, newOwner) => {
        if (!name.startsWith(PREFIX)) return;
        if (oldOwner) this.remove(name);
        if (newOwner) void this.add(name);
      };
      this.daemon.on('NameOwnerChanged', this.ownerChanged);
      const names = await this.daemon.ListNames();
      await Promise.all(names.filter(name => name.startsWith(PREFIX)).map(name => this.add(name)));
      if (!this.disposed) { this.emit('problem', { message: '', unsupported: false }); this.publish(); }
    } catch { this.fail(); }
  }
  fail() {
    if (this.disposed) return;
    this.stopConnection();
    this.emit('problem', { message: 'Could not connect to the desktop media session. Reconnect or search for lyrics manually.', unsupported: false });
    this.publish();
  }
  async add(name) {
    if (this.disposed || this.players.has(name)) return;
    const bus = this.bus;
    const token = Symbol(name); this.discovery.set(name, token);
    try {
      const proxy = await bus.getProxyObject(name, '/org/mpris/MediaPlayer2', MPRIS_XML);
      const properties = proxy.getInterface('org.freedesktop.DBus.Properties');
      const player = proxy.getInterface(PLAYER);
      const values = await properties.GetAll(PLAYER);
      if (this.disposed || bus !== this.bus || this.discovery.get(name) !== token || this.players.has(name)) return;
      const entry = { properties, player, values };
      entry.changed = async (iface, changed, invalidated) => {
        if (iface !== PLAYER || this.players.get(name) !== entry) return;
        Object.assign(entry.values, changed);
        // Refresh invalidated properties and position on status/track changes.
        if (invalidated.length || changed.Metadata || changed.PlaybackStatus || changed.Rate) {
          try { Object.assign(entry.values, await properties.GetAll(PLAYER)); } catch { return; }
        }
        if (this.players.get(name) === entry) this.publish();
      };
      entry.seeked = position => { entry.values.Position = position; this.publish(); };
      properties.on('PropertiesChanged', entry.changed);
      player.on('Seeked', entry.seeked);
      this.players.set(name, entry);
      this.publish();
    } catch { /* A player can disappear while being discovered. */ }
  }
  remove(name) {
    this.discovery.delete(name);
    const entry = this.players.get(name);
    if (entry) {
      entry.properties.removeListener('PropertiesChanged', entry.changed);
      entry.player.removeListener('Seeked', entry.seeked);
      this.players.delete(name);
    }
    this.publish();
  }
  select(id) { this.preferred = id; this.publish(); }
  async control(action, position) {
    const name = this.selected;
    const entry = this.players.get(name);
    if (!entry) return false;
    const track = snapshot(name, entry.values);
    switch (action) {
      case 'previous':
        if (!track.capabilities.previous) return false;
        await entry.player.Previous();
        return true;
      case 'playPause':
        if (!track.capabilities.playPause) return false;
        await entry.player.PlayPause();
        return true;
      case 'next':
        if (!track.capabilities.next) return false;
        await entry.player.Next();
        return true;
      case 'seek':
        if (!track.capabilities.seek || !Number.isFinite(position)) return false;
        await entry.player.SetPosition(track.trackId, BigInt(Math.round(Math.min(track.duration, Math.max(0, position)) * 1e6)));
        return true;
      default:
        return false;
    }
  }
  publish() {
    if (this.disposed) return;
    const players = [...this.players].map(([name, entry]) => snapshot(name, entry.values));
    this.selected = choosePlayer(players, this.selected, this.preferred);
    this.emit('update', { players, track: players.find(p => p.id === this.selected) || null, preferred: this.preferred });
  }
  setVisible(visible) {
    this.visible = visible;
    clearInterval(this.timer);
    if (visible && !this.disposed) {
      void this.pollPosition();
      this.timer = setInterval(() => void this.pollPosition(), 1000);
    }
  }
  async pollPosition() {
    const entry = this.players.get(this.selected);
    if (!entry || this.polling) return;
    this.polling = true;
    try {
      const [position, status] = await Promise.allSettled([
        entry.properties.Get(PLAYER, 'Position'),
        entry.properties.Get(PLAYER, 'PlaybackStatus')
      ]);
      if (this.players.get(this.selected) !== entry) return;
      if (position.status === 'fulfilled') entry.values.Position = position.value;
      if (status.status === 'fulfilled') entry.values.PlaybackStatus = status.value;
      if (position.status === 'fulfilled' || status.status === 'fulfilled') this.publish();
    } catch { /* Player properties can become unavailable between polls. */ }
    finally { this.polling = false; }
  }
  stopConnection() {
    this.discovery.clear();
    if (this.daemon && this.ownerChanged) this.daemon.removeListener('NameOwnerChanged', this.ownerChanged);
    for (const name of [...this.players.keys()]) this.remove(name);
    this.bus?.disconnect(); this.bus = null; this.daemon = null;
  }
  async reconnect() {
    if (this.reconnecting) return this.reconnecting;
    this.reconnecting = (async () => { this.stopConnection(); await this.start(); })();
    try { await this.reconnecting; } finally { this.reconnecting = null; }
  }
  dispose() { this.disposed = true; clearInterval(this.timer); this.stopConnection(); this.removeAllListeners(); }
}
module.exports = { MediaMonitor, seconds, snapshot, choosePlayer };

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { loadArtwork } = require('../src/artwork');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

test('Artwork accepts only supported raster signatures, not a claimed MIME type', async () => {
  const data = await loadArtwork('https://example.com/cover', undefined, async () => new Response(png));
  assert.equal(data, `data:image/png;base64,${png.toString('base64')}`);
  for (const [mime, bytes] of [['jpeg', Buffer.from([255, 216, 255, 0])], ['gif', Buffer.from('GIF89a')], ['webp', Buffer.from('RIFF0000WEBP')]]) {
    assert.match(await loadArtwork('https://example.com/cover', undefined, async () => new Response(bytes)), new RegExp(`^data:image/${mime};base64,`));
  }
  assert.equal(await loadArtwork('https://example.com/cover', undefined, async () => new Response('<svg/>', { headers: { 'content-type': 'image/png' } })), '');
});

test('Artwork rejects unsafe URLs and redirects, network failures and oversized streams', async () => {
  let requests = 0;
  const fetcher = async () => { requests++; return new Response(png); };
  for (const url of ['not a URL', 'http://example.com/a', 'data:image/png;base64,AA==', 'https://user:pass@example.com/a', 'file://remote/cover.png']) {
    assert.equal(await loadArtwork(url, undefined, fetcher), '');
  }
  assert.equal(requests, 0);
  assert.equal(await loadArtwork('https://example.com/a', undefined, async () => new Response(null, { status: 302, headers: { location: 'http://example.com/a' } })), '');
  assert.equal(await loadArtwork('https://example.com/a', undefined, async () => { throw new Error('Offline'); }), '');
  assert.equal(await loadArtwork('https://example.com/a', undefined, async () => new Response(null, { status: 404 })), '');
  assert.equal(await loadArtwork('https://example.com/a', undefined, async () => new Response(png, { headers: { 'content-length': String(6 * 1024 * 1024) } })), '');
  let cancelled = false;
  const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); }, cancel() { cancelled = true; } });
  assert.equal(await loadArtwork('https://example.com/a', undefined, async () => new Response(body)), '');
  assert.equal(cancelled, true);
  const controller = new AbortController(); controller.abort();
  assert.equal(await loadArtwork('https://example.com/a', controller.signal, async (_url, options) => { options.signal.throwIfAborted(); return new Response(png); }), '');
});

test('Artwork follows HTTPS redirects and bounds redirect loops', async () => {
  let calls = 0;
  const fetcher = async url => {
    calls++;
    return url.pathname === '/a' ? new Response(null, { status: 302, headers: { location: '/b' } }) : new Response(png);
  };
  assert.match(await loadArtwork('https://example.com/a', undefined, fetcher), /^data:image\/png/);
  assert.equal(calls, 2);
  calls = 0;
  assert.equal(await loadArtwork('https://example.com/a', undefined, async () => { calls++; return new Response(null, { status: 302, headers: { location: '/a' } }); }), '');
  assert.equal(calls, 6);
});

test('Local artwork uses the same raster validation and byte limit', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lyrics-artwork-'));
  try {
    const file = join(dir, 'cover.png');
    await writeFile(file, png);
    assert.match(await loadArtwork(pathToFileURL(file)), /^data:image\/png/);
    await writeFile(file, '<html>not artwork</html>');
    assert.equal(await loadArtwork(pathToFileURL(file)), '');
    await writeFile(file, Buffer.alloc(5 * 1024 * 1024 + 1));
    assert.equal(await loadArtwork(pathToFileURL(file)), '');
    assert.equal(await loadArtwork(pathToFileURL(join(dir, 'missing.png'))), '');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

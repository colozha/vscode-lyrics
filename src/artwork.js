'use strict';
const { createReadStream } = require('node:fs');
const MAX_BYTES = 5 * 1024 * 1024;

async function loadArtwork(value, signal, fetcher = require('undici').fetch) {
  try {
    let url = new URL(value);
    const deadline = AbortSignal.timeout(5000);
    const boundedSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    let stream;
    if (url.protocol === 'file:') {
      if (url.hostname && url.hostname !== 'localhost') return '';
      stream = createReadStream(url, { signal: boundedSignal });
    } else {
      for (let redirects = 0; redirects <= 5; redirects++) {
        if (url.protocol !== 'https:' || url.username || url.password) return '';
        const response = await fetcher(url, { signal: boundedSignal, redirect: 'manual' });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          await response.body?.cancel();
          const location = response.headers.get('location');
          if (!location) return '';
          url = new URL(location, url);
          continue;
        }
        if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) {
          await response.body?.cancel();
          return '';
        }
        stream = response.body;
        break;
      }
    }
    if (!stream) return '';
    const chunks = [];
    let size = 0;
    for await (const chunk of stream) {
      boundedSignal.throwIfAborted();
      size += chunk.length;
      if (size > MAX_BYTES) return '';
      chunks.push(chunk);
    }
    boundedSignal.throwIfAborted();
    const data = Buffer.concat(chunks);
    const mime = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
      : data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'image/jpeg'
      : /^GIF8[79]a$/.test(data.toString('ascii', 0, 6)) ? 'image/gif'
      : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : '';
    return mime ? `data:${mime};base64,${data.toString('base64')}` : '';
  } catch { return ''; }
}

module.exports = { loadArtwork };

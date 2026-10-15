# LyricFlow: Lyrics for VS Code

Read song lyrics in the VS Code sidebar. On Linux, the extension reads player metadata through D-Bus/MPRIS and finds lyrics on [LRCLIB](https://lrclib.net), with [lyrics.ovh](https://lyrics.ovh) as a plain-lyrics fallback. Manual search works on Linux, Windows, and macOS; automatic player detection is currently Linux-only.

## Run from source

1. Open this folder in VS Code desktop.
2. Run `npm ci --omit=optional` (Node.js 22 or later for tooling).
3. Press **F5** and choose **Run Lyrics**.
4. In the Extension Development Host window, click **Lyrics** in the Activity Bar or run **Lyrics: Open Sidebar** from the Command Palette.
5. On Linux, play music in a browser or player that publishes an MPRIS session, such as Brave, Firefox, Spotify, or VLC.

The extension does not require `playerctl`. For automatic detection, VS Code must run in the same Linux desktop session as the player and be able to access the session D-Bus. In Remote SSH, WSL, or Dev Containers, the extension runs on the local UI side, so automatic detection requires that UI host to be Linux.

## Use

- The **Player** selector in the footer chooses a media source. **Automatic** follows the active source.
- When the source exposes them, **Previous**, **Play/Pause**, **Next**, and **Seek** control playback. Unsupported actions are disabled.
- Timestamped lyrics highlight the current line and follow playback. Scroll the lyrics to pause following, then select **Follow lyrics** to resume.
- Select **Search** in the header to open manual lyrics search. Search by title or artist and choose a result.
- A manually selected lyric stays active until the selected player changes. **Refresh** returns to automatic lyrics for the current player.
- **Reconnect** retries the Linux media session connection when it fails.

## Support and privacy

The extension UI and manual lyrics search work on Linux, Windows, and macOS. Automatic player detection and playback controls currently use Linux MPRIS only. A browser or player is detected when it publishes a compatible MPRIS session; the extension does not inspect browser tabs, record audio, or recognize songs. Windows and macOS show disabled player controls and keep manual search available.

Incorrect or missing titles, artist metadata, and live/remix versions can prevent a match. Use manual search to select the right version. Players that do not provide a position cannot synchronize lyrics. If several sources are active, automatic selection keeps following the current active source; choose a source manually when needed.

Track title, artist, album, duration, and manual search queries are sent over HTTPS to LRCLIB. For automatic lookup, title and available artist metadata are also sent to lyrics.ovh if LRCLIB has no usable lyrics or its request fails. The extension has no telemetry, account tokens, search history, or proxy server. A cache of up to 100 LRCLIB responses is kept in session memory. lyrics.ovh provides plain lyrics; availability, accuracy, and rights follow each source and the rights holders. Attribution is available in the sidebar footer.

## Test and package

```sh
npm test
npm run check
npm run package
```

The package is written to `vscode-lyrics-0.1.0.vsix`. Install it through **Extensions → … → Install from VSIX…**, or run:

```sh
code --install-extension ./vscode-lyrics-0.1.0.vsix
```

Unit tests use `node:test` for LRC parsing, D-Bus metadata and player control, source selection, lyric matching, HTTP/cache behavior, lyrics fallback, manual search, and stale responses. Unit tests do not require a player, VS Code, or internet access. Verify the UI in the Extension Development Host and playback controls with a real Linux MPRIS player. macOS verification requires a Mac.

## Project structure

- `src/`: VS Code integration, D-Bus, lyrics service, and session state.
- `media/`: Activity Bar icon and sidebar HTML/CSS/JavaScript.
- `test/`: Node.js logic tests.
- `.vscode/launch.json`: F5 debug configuration.

There is no frontend framework or app build step. `dbus-next` reads media; `undici` manages per-client HTTP connections. Both are runtime dependencies; `@vscode/vsce` is only used for packaging.

# VS Code Lyrics
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
JavaScript CommonJS extension host and native HTML/CSS/JavaScript WebviewView. The extension UI and manual search run in VS Code desktop on Linux, Windows, and macOS. Automatic player detection uses Linux D-Bus/MPRIS through dbus-next. HTTPS uses undici fetch with a per-client connection dispatcher. No frontend framework.

## Users
Developers reading lyrics while working in VS Code, with music playing in a desktop application or browser.

## Product Purpose
Automatically identify the current song through system metadata and display internet lyrics in a sidebar, while retaining manual search.

## Operating Context
VS Code desktop, including a local UI connected to a remote workspace. On Linux, the player must expose MPRIS and run in the UI host's desktop session. Windows and macOS support manual lyrics search but do not provide automatic player detection in the single-extension distribution.

## Capabilities and Constraints
Timestamped lyrics follow playback; plain lyrics remain readable. Linux MPRIS sources expose Previous, Play/Pause, Next, and Seek controls when supported by the player. Shuffle and volume remain available in the MPRIS backend but are not exposed in the sidebar. Artwork is read from player metadata and loaded in the extension host from HTTPS or local files with a 5 MiB limit and five-second timeout; unavailable artwork uses a music-note placeholder. A LIVE badge appears only for explicit live-version metadata. Timestamped rows include a time column; section headings are retained from the source lyrics. Manual lyrics remain selected until the current track or selected source changes; manually chosen timestamped lyrics do not follow playback; Refresh returns to automatic lyrics. Search is hidden by default and can be toggled from the track header. No browser companion, audio recognition, or telemetry. LRCLIB is the primary provider, with lyrics.ovh as an automatic plain-lyrics fallback; song metadata and search queries are sent to it. Cache is memory-only and bounded.

## Product Principles
- Keep lyrics primary and native VS Code controls familiar.
- Prefer system integration over browser-specific access.
- Expose missing metadata, lyrics, and connection failures clearly.
- Keep dependencies and project structure small.

## Accessibility & Inclusion
English UI, keyboard access, VS Code theme variables including high contrast, visible focus, reduced-motion support. Playback controls expose action labels and disable unsupported actions. Active lyrics are conveyed by weight, row background, and aria-current as well as color; high-contrast themes add an outline. Narrow sidebars keep progress beside transport controls, with short viewports allowing outer scrolling so all controls remain reachable.

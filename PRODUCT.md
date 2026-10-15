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
Timestamped lyrics follow playback; plain lyrics remain readable. Linux MPRIS sources expose Previous, Play/Pause, Next, and Seek when supported by the player. Manual lyrics remain selected until the selected source changes; Refresh returns to automatic lyrics. Search is collapsed by default and opened from the header. No artwork, browser companion, audio recognition, or telemetry. LRCLIB is the only provider; song metadata and search queries are sent to it. Cache is memory-only and bounded.

## Product Principles
- Keep lyrics primary and native VS Code controls familiar.
- Prefer system integration over browser-specific access.
- Expose missing metadata, lyrics, and connection failures clearly.
- Keep dependencies and project structure small.

## Accessibility & Inclusion
English UI, keyboard access, VS Code theme variables including high contrast, visible focus, reduced-motion support. Playback controls expose action labels and disable unsupported actions. Active lyrics are conveyed by weight and underline as well as color.

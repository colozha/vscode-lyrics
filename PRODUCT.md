# VS Code Lyrics
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
JavaScript CommonJS extension host and native HTML/CSS/JavaScript WebviewView, chosen by the user. VS Code desktop on Linux. D-Bus via dbus-next, HTTPS via undici fetch with a per-client connection dispatcher (isolated from VS Code fetch patching). No frontend framework.

## Users
Developers reading lyrics while working in VS Code, with music playing in a desktop application or browser.

## Product Purpose
Automatically identify the current song through system metadata and display internet lyrics in a sidebar, while retaining manual search.

## Operating Context
Local Linux desktop session, including a local UI connected to a remote workspace. Browser/player must expose MPRIS. Windows and macOS automatic detection are outside v1.

## Capabilities and Constraints
Timestamped lyrics follow playback, plain lyrics remain readable. Manual selection is replaced on the next selected-source track change. No artwork, playback controls, browser extension, audio recognition, or telemetry. LRCLIB is the only provider; song metadata/search queries are sent to it. Cache is memory-only and bounded.

## Product Principles
- Keep lyrics primary and native VS Code controls familiar.
- Prefer system integration over browser-specific access.
- Expose missing metadata, lyrics, and connection failures clearly.
- Keep dependencies and project structure small.

## Accessibility & Inclusion
Indonesian UI, keyboard access, VS Code theme variables including high contrast, visible focus, reduced-motion support. Active lyric conveyed by weight and underline as well as color.

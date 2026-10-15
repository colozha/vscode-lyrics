# Lyrics sidebar

Mode: Operate. Authority: user-supplied reference screenshot and approved implementation plan, October 15, 2026. The reference is attached in chat, not a repository asset.

## Direction contract

THESIS: A compact music player above timestamped lyrics; reading and available player controls share one native VS Code sidebar.

OWN-WORLD: Host theme colors and font, a blue/cyan action accent, rounded artwork and inputs, outline music controls, a circular primary transport button, quiet separators, and a softly highlighted current lyric. Light and high-contrast themes retain native readability.

STORY: Recognize the track, control the selected player, search when matching fails, and read synchronized lyrics. Manual selections, source selection, recovery, attribution, and paused following remain accessible.

FIRST VIEWPORT: Artwork left, title/artist/LIVE center, search/refresh right; transport and progress beneath; an open search field; a flexible two-column time/text lyric region; compact source and attribution footer. Below 480px progress gets its own row. Small heights allow outer scrolling when necessary.

FORM: User-pinned player-and-reading composition; no concept roll or generated replacement. Artwork comes only from player metadata, headings only from source lyrics, and LIVE only from explicit version metadata.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

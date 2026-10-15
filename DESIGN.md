---
name: VS Code Lyrics
description: A theme-adaptive music player and lyric reading surface in the VS Code sidebar.
colors:
  accent: "var(--vscode-textLink-foreground, #009fe3)"
  foreground: "var(--vscode-foreground)"
  muted: "var(--vscode-descriptionForeground)"
  sidebar: "var(--vscode-sideBar-background)"
  border: "var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 16%, transparent))"
  active: "color-mix(in srgb, var(--lyrics-accent) 18%, transparent)"
  time: "color-mix(in srgb, var(--vscode-foreground) 75%, var(--lyrics-accent))"
  input-background: "var(--vscode-input-background)"
  input-foreground: "var(--vscode-input-foreground)"
  input-border: "var(--vscode-input-border, var(--lyrics-border))"
  placeholder: "var(--vscode-input-placeholderForeground)"
  button-background: "var(--vscode-button-background)"
  button-foreground: "var(--vscode-button-foreground)"
  button-hover: "var(--vscode-button-hoverBackground)"
  toolbar-hover: "var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground))"
  result-hover: "var(--vscode-list-hoverBackground)"
  badge-background: "var(--vscode-badge-background)"
  badge-foreground: "var(--vscode-badge-foreground)"
  focus: "var(--vscode-focusBorder)"
  contrast-border: "var(--vscode-contrastBorder)"
  contrast-active: "var(--vscode-contrastActiveBorder, var(--vscode-focusBorder))"
  active-selection-background: "var(--vscode-list-activeSelectionBackground)"
  active-selection-foreground: "var(--vscode-list-activeSelectionForeground)"
  error: "var(--vscode-errorForeground)"
  selection: "var(--vscode-editor-selectionBackground)"
  scrollbar: "var(--vscode-scrollbarSlider-background)"
typography:
  title:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  title-narrow:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "var(--vscode-font-size, 13px)"
    lineHeight: 1.6
  artist:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "15px"
    lineHeight: 1.45
  artist-narrow:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "13px"
    lineHeight: 1.45
  synced-lyric:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "16px"
    lineHeight: 1.6
  plain-lyric:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "15px"
    lineHeight: 1.9
  section:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "15px"
    fontWeight: 500
  label:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "12px"
  footer:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "11px"
  badge:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: ".03em"
rounded:
  badge: "4px"
  control: "6px"
  input: "7px"
  artwork: "9px"
  circular: "50%"
spacing:
  detail: "4px"
  compact: "6px"
  row: "8px"
  status: "10px"
  section: "12px"
  inset: "16px"
  player: "20px"
components:
  button-primary:
    backgroundColor: "{colors.button-background}"
    textColor: "{colors.button-foreground}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  button-play:
    backgroundColor: "{colors.button-background}"
    textColor: "{colors.button-foreground}"
    rounded: "{rounded.circular}"
    width: "32px"
    height: "32px"
    padding: "0"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  button-secondary-hover:
    backgroundColor: "{colors.toolbar-hover}"
  button-header:
    backgroundColor: "{colors.input-background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.input}"
    width: "28px"
    height: "28px"
    padding: "0"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    padding: "0"
  search-field:
    backgroundColor: "{colors.input-background}"
    textColor: "{colors.input-foreground}"
    rounded: "{rounded.input}"
    padding: "0 10px"
  source-select:
    backgroundColor: "{colors.input-background}"
    textColor: "{colors.input-foreground}"
    rounded: "{rounded.control}"
    padding: "4px 6px"
  search-result:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    padding: "10px 6px"
    width: "100%"
  live-badge:
    backgroundColor: "{colors.badge-background}"
    textColor: "{colors.badge-foreground}"
    typography: "{typography.badge}"
    rounded: "{rounded.badge}"
    padding: "2px 6px"
  artwork:
    backgroundColor: "{colors.input-background}"
    textColor: "{colors.muted}"
    rounded: "{rounded.artwork}"
    width: "96px"
    height: "96px"
  lyric-row:
    textColor: "{colors.foreground}"
    typography: "{typography.synced-lyric}"
    rounded: "{rounded.control}"
    padding: "7px 8px"
  lyric-row-active:
    backgroundColor: "{colors.active}"
---

# Design System: VS Code Lyrics

## Overview

**Creative North Star: "Native VS Code reading surface"**

The sidebar combines a compact music player with a flexible lyric reading surface. It inherits VS Code's theme and font, using artwork, outline controls, quiet separators, and a softly highlighted current row to establish track context without competing with the lyrics.

The approved player composition is theme-adaptive: artwork sits beside title and artist, search is hidden initially, and available playback controls remain visible. Source selection, playback status, lyric mode, attribution, reconnect, and paused-follow recovery retain their existing roles.

**Key Characteristics:**
- Host-owned colors and typography.
- Artwork and capability-aware outline playback controls.
- Collapsible search and timestamped lyric rows with source-provided headings.
- Flat surfaces, visible focus, and explicit high-contrast states.
- Responsive reading space with reachable controls in short viewports.

## Colors

### Primary

The host link accent gives timestamps, section headings, attribution, and selected shuffle a shared voice. The host button roles supply the circular Play/Pause action. The reference's blue/cyan character follows the selected VS Code theme rather than a fixed independent palette.

### Neutral

Sidebar, foreground, description, input, badge, border, hover, scrollbar, selection, error, and focus roles come from VS Code. The current lyric uses a translucent accent mixture; timestamp color mixes foreground with the accent. High-contrast themes replace these mixtures with host selection and foreground roles and outline the active row.

**The Host Theme Rule.** Preserve VS Code theme roles and the derived accent mixtures; high-contrast overrides take precedence over translucent treatments.

## Typography

Use the host font family throughout. The frontmatter owns the implemented hierarchy: responsive title and artist roles, synchronized and plain lyrics, source section headings, labels, footer, and LIVE badge. Titles and result titles are semibold; the active lyric and its timestamp gain semibold weight. Timestamp and playback values use tabular numerals. Long metadata, section headings, and lyric text wrap; plain lyrics preserve source line breaks. Playback time, lyric mode, and footer use the footer scale; search, connection, volume, and control messages use the label scale.

## Layout

A viewport-height flex column contains the track header, transport and progress, optional search, contextual connection recovery, flexible lyric region, and two-row footer. The wide header uses artwork, flexible track copy, and actions in three columns. Artwork is square (96px); shared horizontal insets use the inset token. Search has a minimum height (40px). Results scroll within a bounded region (maximum `min(220px, 30vh)`).

Below 480px, artwork becomes compact (64px) with the input radius, title and artist use their narrow roles, header actions stack (28px each), and progress moves below transport. Transport distributes across the width. Transport and header buttons are 28px square with 16px icons; Play/Pause remains circular (32px) with an 18px icon. At widths of 300px and below, horizontal insets shrink (12px), and the timestamp column narrows (42px to 36px). At heights of 420px and below, header, transport, search, lyric toolbar, and footer spacing compress. The body scrolls vertically when minimum content exceeds the viewport so controls remain reachable.

The lyric region has a minimum height (60px) and its own vertical scrolling; its toolbar is compact (36px minimum, 30px in short views). Synchronized rows use a fixed timestamp column and a flexible text column, with trailing reading room (35vh). Source headings align with lyric text. Footer rows and the Player selector wrap; the selector retains a minimum width (70px).

## Elevation & Depth

Surfaces are flat with no shadows. Thin host-colored borders separate player context, search, recovery, and footer. Inputs and artwork supply restrained tonal surfaces. Hover, focus, selected shuffle, and the active lyric background communicate state without decorative elevation. Loading uses a static two-band placeholder rather than an animated shimmer.

## Shapes

Small rounded rectangles organize badge, controls, lyric rows, inputs, and artwork; the frontmatter records their radius roles. Compact artwork shares the input radius. Play/Pause is circular. Outline icons use rounded caps and joins; the play triangle is filled. Dividers and control borders are thin (1px). Keyboard focus is an outline (2px, offset 2px), while the composite search field uses a focus-within outline (1px, offset 1px). High-contrast buttons gain a host contrast border and the active lyric gains an inset outline (1px).

## Components

### Buttons

Outline SVG icons provide search, refresh, shuffle, previous, next, volume, and transport affordances; each action has an accessible English name. Play/Pause uses host primary-button colors; other controls are transparent or input-backed header buttons with host toolbar hover. Unsupported or pending playback actions are disabled. Disabled buttons reduce opacity (0.45), and disabled inputs/selects use reduced opacity (0.55). Search uses a waiting cursor while active. Attribution is a text-style button with an underline on hover. Reconnect and Follow lyrics remain compact text buttons.

### Inputs / Fields

Search is hidden initially and can be toggled from the header; reopening focuses its field. A search icon, expanding query input, and arrow submit action share one rounded input surface with an accessible label. Enter also submits. Search status and results appear below. The footer retains native Player selection. Seek and the optional Volume panel use native range inputs tinted with the accent; volume opens from its icon and Escape closes it and returns focus. Unsupported range actions stay disabled. Control failures appear as contextual recovery text.

### Artwork and LIVE

Artwork uses cropped, rounded player-provided imagery. Missing, rejected, or manual-selection artwork uses the outlined music-note placeholder. The artwork is decorative beside textual track metadata. LIVE is a small host-colored badge shown only for explicit live-version metadata; it is not a connection indicator.

### Search Results

Full-width result buttons have a bottom divider, semibold title, and muted artist, duration, and synchronization details. Hover uses the host list background. Manual selection preserves its lyric record until track or player changes; Refresh returns to automatic lyrics.

### Lyrics

Synchronized lines pair a time column with selectable, wrapping text. The current automatic line uses the active-row background, semibold text and timestamp, accent timestamp color, and `aria-current`; high contrast adds an outline and selection foreground. Section headings are rendered only from source lyrics. Manual timestamped lyrics retain timestamps without following playback. Plain lyrics preserve line breaks without a time column.

Manual scrolling pauses following and exposes Follow lyrics. Automatic following scrolls smoothly to keep the current line near the upper reading area; reduced-motion preferences select immediate scrolling. There are no entrance animations. Waiting, loading, missing lyrics, instrumental tracks, provider errors, connection errors, and unsupported-platform states use contextual English text and applicable recovery actions. Loading marks the lyric region busy. Footer source, playback status, lyric mode, and provider attribution remain available across states.

## Do's and Don'ts

### Do:
- Do inherit host theme colors and font family.
- Do preserve the artwork, metadata, header actions, transport, collapsible search, lyric region, and footer hierarchy.
- Do retain accessible action labels, keyboard focus, text selection, wrapping, and high-contrast outlines.
- Do convey the current lyric with row background, semibold weight, and aria-current as well as color.
- Do respect reduced motion and pause following during manual reading.
- Do show artwork, LIVE, and section headings only when supported by the relevant metadata or lyric source.

### Don't:
- Don't add an independent light/dark palette, decorative typeface, or shadows.
- Don't open search by default or use an underline-only current lyric.
- Don't enable unsupported playback actions or imply that manual timestamped lyrics follow the player.
- Don't clip controls or footer content in narrow or short views.

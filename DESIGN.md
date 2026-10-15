---
name: VS Code Lyrics
description: A compact, native sidebar for reading lyrics and controlling available playback while working.
colors:
  foreground: "var(--vscode-foreground)"
  muted: "var(--vscode-descriptionForeground)"
  sidebar: "var(--vscode-sideBar-background)"
  border: "var(--vscode-panel-border)"
  section-border: "var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border))"
  input-background: "var(--vscode-input-background)"
  input-foreground: "var(--vscode-input-foreground)"
  input-border: "var(--vscode-input-border, transparent)"
  placeholder: "var(--vscode-input-placeholderForeground)"
  button-background: "var(--vscode-button-background)"
  button-foreground: "var(--vscode-button-foreground)"
  button-hover: "var(--vscode-button-hoverBackground)"
  secondary-background: "var(--vscode-button-secondaryBackground)"
  secondary-foreground: "var(--vscode-button-secondaryForeground)"
  secondary-hover: "var(--vscode-button-secondaryHoverBackground)"
  link: "var(--vscode-textLink-foreground)"
  focus: "var(--vscode-focusBorder)"
  contrast-border: "var(--vscode-contrastBorder)"
  selection: "var(--vscode-editor-selectionBackground)"
  result-hover: "var(--vscode-list-hoverBackground)"
  scrollbar: "var(--vscode-scrollbarSlider-background)"
typography:
  title:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "var(--vscode-font-size, 13px)"
    lineHeight: 1.6
  synced-lyric:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "16px"
    lineHeight: 1.65
  plain-lyric:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "15px"
    lineHeight: 1.9
  label:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "12px"
  footer:
    fontFamily: "var(--vscode-font-family)"
    fontSize: "11px"
rounded:
  control: "2px"
spacing:
  detail: "4px"
  control-gap: "6px"
  line: "8px"
  status: "10px"
  inset: "16px"
components:
  button-primary:
    backgroundColor: "{colors.button-background}"
    textColor: "{colors.button-foreground}"
    rounded: "{rounded.control}"
    padding: "5px 10px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary-background}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.control}"
    padding: "5px 10px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.link}"
    padding: "0"
  input:
    backgroundColor: "{colors.input-background}"
    textColor: "{colors.input-foreground}"
    rounded: "{rounded.control}"
    padding: "5px 6px"
  source-select:
    backgroundColor: "{colors.input-background}"
    textColor: "{colors.input-foreground}"
    rounded: "{rounded.control}"
    padding: "5px 6px"
  search-result:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "10px 6px"
    width: "100%"
---

# Design System: VS Code Lyrics

## Overview

**Creative North Star: "Native VS Code reading surface"**

Operate mode is quiet, compact, and familiar. The sidebar inherits the user's VS Code theme. Track metadata and compact playback controls establish context; lyrics receive the flexible reading space. Manual search starts collapsed behind a header action, and player selection lives in the footer.

**Key Characteristics:**
- Host-owned colors and typography.
- Compact metadata and playback controls.
- Search is available from the header and starts collapsed.
- Lyrics as the primary reading surface.
- Flat surfaces and visible keyboard focus.

## Colors

### Primary

Host button roles supply action colors and hover states. Link color marks attribution and the current lyric underline.

### Neutral

Host sidebar, foreground, and muted description roles define the reading surface. Inputs, borders, list hover, selection, scrollbars, focus, and contrast borders use their dedicated host roles.

**The Host Theme Rule.** Preserve VS Code theme variables; do not introduce an independent light/dark palette or synthesized tonal ramps.

## Typography

Use the host font family throughout. Frontmatter records the implemented title, UI body, synchronized lyric, plain lyric, label, and footer roles. The title and result titles are semibold. Inactive synchronized lines are muted; the current line gains foreground color, semibold weight, and an underline. Plain lyrics preserve line breaks. Long metadata and lyrics wrap.

## Layout

A viewport-height flex column places metadata and playback controls above optional search, contextual connection recovery, the flexible lyric region, and the footer. Shared horizontal insets align these regions. The player selector and footer content wrap; the search input shrinks beside its button. There is no width breakpoint.

Results scroll within a bounded region (maximum height 220px). Lyrics scroll independently with a minimum region height (80px); synchronized content retains trailing reading room (35vh). The lyric toolbar has a minimum height (44px). At viewport heights of 420px and below, header and search spacing compress.

## Elevation & Depth

Flat surfaces have no shadows. Thin host-colored dividers separate search, recovery messages, result rows, and footer. Hover, focus, and the current lyric mark communicate state.

## Shapes

Controls use the small control radius and thin borders (1px). Keyboard focus uses an outline (1px) with an offset (2px). High-contrast themes apply the host contrast border to buttons. Metadata and lyrics remain unenclosed text.

## Components

### Buttons

Primary buttons serve search; secondary buttons serve transport, refresh, reconnect, and following. Buttons use host colors and compact padding. Hover changes the host background; pressing dims the button. Disabled controls reduce opacity; a disabled search button uses a waiting cursor while a request is active. Attribution is a text-style button with a hover underline. All retain visible keyboard focus.

### Inputs / Fields

Search and native source selection share host input colors, a thin border, and the control radius. Search has a visible label and muted placeholder. Search starts hidden and opens from a header toggle with keyboard focus moved to the query field. The footer source selector has a minimum width (70px), wrapping with its label and playback status when necessary.

### Playback Controls

Previous, Play/Pause, Next, and a seek slider sit directly below the title and artist. Each action is disabled when the current source does not advertise that capability. On operating systems without a supported source, controls remain visible and disabled while manual search remains available. Time values use tabular numerals.

### Search Results

Full-width result buttons have a bottom divider, semibold title, and muted artist/duration/synchronization details. Hover uses the host list background.

### Lyrics

Synchronized lines have vertical padding and a minimum height (40px). The current line uses weight and an underline (2px thickness, 6px offset) as well as color, with matching `aria-current`. Manual scrolling pauses following; a contextual button resumes it. Automatic scrolling is smooth unless reduced motion is requested. There is no entrance animation.

Waiting, loading, missing lyrics, instrumental tracks, and errors use contextual English text and applicable recovery actions. Loading marks the lyric region busy.

## Do's and Don'ts

### Do:
- Do inherit host theme colors and font family.
- Do keep metadata, playback controls, and optional search compact so lyrics receive the flexible reading space.
- Do retain labels, keyboard focus, text selection, wrapping, and high-contrast borders.
- Do convey the current lyric with weight and underline as well as color.
- Do respect reduced motion and pause following during manual reading.

### Don't:
- Don't introduce artwork into this sidebar.
- Don't add an independent palette, decorative typeface, or shadows.
- Don't turn lyric lines into cards or make manual search unreachable from the header.

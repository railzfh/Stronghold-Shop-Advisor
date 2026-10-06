# Version history

## 1.0.12 - 2026-10-06

- Extracted the browser extension into the standalone `Stronghold-Shop-Advisor` project.
- Added standalone validation, catalog synchronization, release packaging, contributor rules and GitHub CI templates.
- Kept the extension behavior unchanged while making the repository root directly loadable as an unpacked Chromium extension.

## 1.0.11 - 2026-10-06

- Added optional ban advisor analysis to the unified config.
- Added popup/page severity results for visible banned operators.

## Unreleased - 2026-10-06

- Added optional `banAdvisor` groups to the unified configuration.
- Reads visible banned operator names from the game's briefing/info UI, matches them to the extension catalog, and reports `critical`, `warning` and `info` results in the popup and page advisor area.
- Validates unknown IDs, duplicate groups/members, conditions, severities and message lengths. Missing `banAdvisor` keeps the old behavior.

## 1.0.10 - 2026-10-05

- Moved the attention button below the game's ready button.
- Moved the attention panel into the top center between the player and enemy information buttons.
- Removed the old shop-toolbar placement and verified the new positions on the running game mock page with no horizontal overflow.

## 1.0.9 - 2026-10-05

- Fixed `MAX_BYTES is not defined` when importing a unified configuration. The popup now imports the shared size constant from `core.js`.
- Also imports the strategy parser explicitly for restoring saved configurations.

## 1.0.8 - 2026-10-05

- Fixed the round-attention panel layout: it is anchored above the remaining-deployment row instead of participating in the shop toolbar grid.
- Added a width and height limit, wrapping, scrolling and shadow so notes do not cover the board unpredictably or create horizontal overflow.
- Verified on the running game mock page: the note panel is right-aligned above the deployment counter and the document has no horizontal overflow.

## 1.0.7 - 2026-10-06

- Unified strategy rules and round attention notes into `default-config.json` and a single import/export flow.
- Fixed the real-game connection path: the popup now searches all browser windows for the active HTTP game page, and the extension declares HTTP/HTTPS host access for the explicit Apply action.
- Verified against the running local game service: connection succeeds, one card is matched, and the round 6 note expands in the game page.

## 1.0.6 - 2026-10-05

- Added a round attention button beside the game's remaining-deployment count.
- Added per-round/default `attention-notes.json` configuration, popup import/export, and a Chinese authoring guide.
- Notes are plain text, validated before import, displayed above the deployment count, and never trigger game actions.

## Unreleased - 2026-10-05

- Added a configurable current-round attention button beside the remaining-deployment count.
- Merged strategy rules and round attention notes into one validated `stronghold.shop-advisor-config` file.
- Added a unified configuration writing guide and import/export flow.
- Notes are injected into the existing page without changing game source files; they do not trigger any game action.

## 1.0.5 - 2026-10-05

- Fixed native action popups collapsing to 155px: the body used `max-width: 100vw` while the root had no requested width, making the initial narrow popup viewport constrain the measured content.
- Set an extension-only root width before stylesheet measurement and adjust height after the browser measures its available popup space. Ordinary web preview sizing remains responsive.
- Added a real Edge action-popup regression script for short and normal browser windows, checking width, horizontal overflow, title wrapping and footer visibility.

## 1.0.4 - 2026-10-05

- Added an independently installable Manifest V3 extension with storage, activeTab and scripting permissions.
- Redesigned the strategy popup: fixed header/footer, scrollable rules, bond/operator tabs, search, configured-only filter, editable reasons and three priority levels.
- Added strict JSON import with confirmation, download export, and a bundled Yan/Investor preset.
- Added a DOM adapter for shop and promotion cards. Refreshes update recommendations; disabling restores original outlines. No game source files changed.
- Added a compact catalog generator and local UI preview server.
- Verification: strategy unit tests; Playwright popup interaction, JSON round trip, persistence and screenshots at 440x590 / 360x520; real Edge unpacked-extension load and storage; game mock DOM highlighting and removal with stubbed extension message delivery.
- Limitation: activeTab toolbar-click injection was not end-to-end automated. DOM adapter requires the existing shop selectors; no dynamic layer/profit estimation or hidden-state access.

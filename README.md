# Filename Search

`Filename Search` started as a focused filename-only search plugin and has grown into a practical explorer toolkit for Obsidian.

The main problem this plugin tries to solve is simple:

- searching by file name in large vaults should be fast and always available
- the file explorer should be easier to style, scan, and navigate
- common cleanup actions should be one click away instead of hidden in manual editing steps

## What the plugin does

- Adds a dedicated filename search view that searches file names only
- Adds a compact tool bar to the file explorer
- Adds a matching icon toolbar to the search tab
- Groups toolbar actions into compact split buttons and menus
- Shows recursive folder sizes
- Lists all pinned files in one compact view
- Opens a folder browser view in the main workspace
- Lets you style folders and files with text colors, row backgrounds, icons, and icon badge colors
- Supports Lucide icons and SVG icons from inside the vault
- Supports emoji and Lucide-style frontmatter sticker references
- Uses frontmatter `sticker` as a fallback file icon when enabled
- Adds a context menu action to copy the vault-relative path
- Adds a one-click cleanup action for duplicate empty lines in the active Markdown note
- Adds callout insertion, callout merging into multi-column layouts, and callout removal back to plain text

## Why this plugin exists

Many vaults grow into a mix of folders, projects, meeting notes, attachments, and generated content from AI tools.
At that point, the default explorer often needs a little more structure:

- faster search
- visual grouping
- pinned notes across folders
- clearer icons
- quick cleanup of pasted Markdown

This plugin focuses on those workflow gaps without introducing network dependencies or cloud services.

## Features

### 1. Filename search

The search view only searches file names, not note contents.

Example:

- Searching for `meeting` finds files like `2025-09-08 AO Offsite.md`
- Searching for `proj plan` can still match a file like `Project Plan Q4.md`

Useful when:

- you know the note name but not where it lives
- your vault is too large to scan manually

### 2. Explorer toolbar

The explorer toolbar gives you one-click access to:

- filename search
- folder sizes and pinned files through the search split button
- duplicate empty-line cleanup for the active note
- heading level up/down through the cleanup split button
- callout tools through the callout split button

Toolbar groups include subtle hover labels such as:

- Search
- Formatting
- Callouts

### 3. Folder sizes

The folder sizes view calculates recursive folder size and file count.

Each row shows:

- folder name
- recursive file count in parentheses
- recursive size

Empty folders are hidden from the results.

Example:

- `(12) 4.3 MB` means the folder contains 12 files in total across all nested subfolders

### 4. Pinned files view

The pinned view collects all pinned files and shows them in one compact list.

This is helpful when:

- you pin working notes from different projects
- you want a light-weight dashboard without moving files around

Files can now be pinned from:

- the folder browser cards
- the filename search result list

### 5. Folder browser

Clicking folders in the explorer can optionally open a folder browser in the main workspace.

The folder browser can show:

- folders
- notes with content preview
- images
- files

It also supports:

- sort modes
- per-folder pinning
- recursive listing
- file and folder context menus

### 6. Explorer styling

You can define styles per file or folder:

- text color
- row background color
- icon
- icon color
- icon background

For folders, styles can optionally be inherited by subfolders.

Color inheritance is merged property by property:

- child folder colors override parent folder colors
- icons remain independent unless explicitly set

### 7. Frontmatter sticker support

When enabled, the plugin can use a note's frontmatter `sticker` field as a fallback icon.

Supported examples:

```yaml
---
sticker: star
---
```

```yaml
---
sticker: 99 Attachments/000 Icons/01 Flags SVG/de.svg
---
```

```yaml
---
sticker: vault//99 Attachments/000 Icons/01 Flags SVG/de.svg
---
```

```yaml
---
sticker: emoji//26f2
---
```

```yaml
---
sticker: lucide//calendar
---
```

The callout picker can also read additional custom callouts from the `Callout Manager` plugin settings and shows whether a callout is built-in or comes from Callout Manager.

### 8. Callout tools

The plugin includes three callout actions:

- wrap selected text in a callout
- merge selected callouts into multi-column callouts
- remove selected callouts and convert them back to plain text

If you use `Callout Manager`, its saved custom callouts are also available in the picker, including icon and color hints when they are defined.

### 9. Markdown paste cleanup

AI-generated Markdown often includes extra blank lines, especially around lists.

The cleanup action removes:

- duplicate empty lines
- blank lines between consecutive list items
- empty task markers that were split from their text
- empty lines between bold labels and their following paragraph
- empty lines directly under headings

Example:

Before:

```md
- Item one

- Item two

- Item three
```

After:

```md
- Item one
- Item two
- Item three
```

The cleanup rules are configurable in plugin settings.

## How to use the plugin

### Search by file name

1. Open the search view from the explorer toolbar
2. Type part of the file name
3. Press `Enter` to open the selected file

### Style a folder or file

1. Right-click a file or folder in the explorer
2. Select `Select icon and color`
3. Choose text color, row background, icon, and icon colors
4. Save

If a file or folder already has explorer colors, the dialog starts from those colors.
If no color is set, it stays unset and is shown with a gray checker pattern.

### Copy the vault-relative path

1. Right-click a file or folder in the explorer
2. Select `Copy vault-relative path`

### Open the folder browser

1. Right-click a folder and select `Open in folder browser`
2. Or enable opening the folder browser directly from explorer clicks in settings

### Clean duplicate empty lines

1. Open a Markdown note
2. Click the eraser icon in the explorer toolbar or the search tab toolbar

### Use callout tools

1. Select text or existing callouts
2. Open the callout menu from the toolbar
3. Choose one of these actions:
4. `Insert callout`
5. `Merge selected callouts into columns`
6. `Remove callouts from selection`

### Pin a file from search results

1. Open the filename search view
2. Search for the file
3. Click the small pin icon in the top-right corner of the result row

## Settings

The plugin settings are available under:

- `Settings -> Community plugins -> Filename Search`

Current settings include:

- show file path in search results
- show modified date in search results
- open folder browser from explorer clicks
- use frontmatter `sticker` icons as fallback icons
- configure AI Markdown cleanup rules individually
- exclude folders from filename search
- review and edit saved explorer style rules

## Language support

The plugin UI is prepared for:

- English
- German
- French
- Spanish

Other locales fall back to English.

## Privacy and security

- No telemetry
- No external service calls
- No cloud account required
- No vault content leaves the device

The plugin works locally inside the vault and uses Obsidian APIs for data and UI behavior.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Release notes for maintainers

For Obsidian community plugin releases, the release artifacts should include:

- `manifest.json`
- `main.js`
- `styles.css`

`main.js` should be attached to releases, but should not be versioned in the repository itself.

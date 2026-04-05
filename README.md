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
- Shows recursive folder sizes
- Lists all pinned files in one compact view
- Opens a folder browser view in the main workspace
- Lets you style folders and files with text colors, row backgrounds, icons, and icon badge colors
- Supports Lucide icons and SVG icons from inside the vault
- Uses frontmatter `sticker` as a fallback file icon when enabled
- Adds a context menu action to copy the vault-relative path
- Adds a one-click cleanup action for duplicate empty lines in the active Markdown note

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
- folder sizes
- pinned files
- duplicate empty-line cleanup for the active note

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

The pinned view collects all files pinned from folder browser views and shows them in one compact list.

This is helpful when:

- you pin working notes from different projects
- you want a light-weight dashboard without moving files around

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

### 8. Markdown paste cleanup

AI-generated Markdown often includes extra blank lines, especially around lists.

The cleanup action removes:

- duplicate empty lines
- blank lines between consecutive list items

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

### Copy the vault-relative path

1. Right-click a file or folder in the explorer
2. Select `Copy vault-relative path`

### Open the folder browser

1. Right-click a folder and select `Open in folder browser`
2. Or enable opening the folder browser directly from explorer clicks in settings

### Clean duplicate empty lines

1. Open a Markdown note
2. Click the eraser icon in the explorer toolbar or the search tab toolbar

## Settings

The plugin settings are available under:

- `Settings -> Community plugins -> Filename Search`

Current settings include:

- show file path in search results
- show modified date in search results
- open folder browser from explorer clicks
- use frontmatter `sticker` icons as fallback icons
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

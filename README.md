# Filename Search

Adds a dedicated filename search to Obsidian's left sidebar.

## Features

- Dedicated left sidebar view with a custom search icon
- Command palette action: `Open file name search`
- Input focus lands in the search field when the view is opened or activated
- Live results across the whole vault
- Searches file names only, not note contents
- Supports path matches and simple fuzzy matching
- Keyboard navigation with arrow keys
- `Enter` opens the selected result
- `Cmd` + click opens a result in a new tab
- `Cmd` + `Enter` opens the selected result in a new tab
- Optional display of path and modified date
- Excluded folders list in plugin settings
- Built-in UI translations for English, German, Spanish, French, and Portuguese
- Automatically refreshes when files are created, renamed, deleted, or modified

## Settings

The plugin settings are available under **Settings -> Community plugins -> Filename Search**.

Current options:

- `Show path`
- `Show modified date`
- `Excluded folders`

Excluded folders can be added through a folder picker and removed individually from the list.

## Development

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## Usage

- Click the plugin icon in the left sidebar to open the filename search view
- Start typing immediately to filter results
- Use `ArrowUp` and `ArrowDown` to change the selection
- Press `Enter` to open the selected file
- Press `Cmd` + `Enter` to open the selected file in a new tab
- Use `Cmd` + click on any result to open it in a new tab

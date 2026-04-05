import { Notice, TAbstractFile, TFolder } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";

export function registerVaultPathContextMenu(plugin: ObsidianFilenameSearchPlugin) {
	plugin.registerEvent(
		plugin.app.workspace.on("file-menu", (menu, file) => {
			addCopyPathMenuItem(plugin, menu, [file]);
			addAppearanceMenuItem(plugin, menu, file);
			addOpenFolderBrowserMenuItem(plugin, menu, file);
		}),
	);

	plugin.registerEvent(
		plugin.app.workspace.on("files-menu", (menu, files) => {
			addCopyPathMenuItem(plugin, menu, files);
		}),
	);
}

function addCopyPathMenuItem(
	plugin: ObsidianFilenameSearchPlugin,
	menu: import("obsidian").Menu,
	files: TAbstractFile[],
) {
	if (files.length === 0) {
		return;
	}

	const label = files.length === 1
		? plugin.strings.contextMenuCopyPath
		: plugin.strings.contextMenuCopyPaths;

	menu.addItem((item) => {
		item
			.setTitle(label)
			.setIcon("copy")
			.onClick(() => {
				void copyPaths(plugin, files);
			});
	});
}

async function copyPaths(plugin: ObsidianFilenameSearchPlugin, files: TAbstractFile[]) {
	const value = files.map((file) => file.path).join("\n");

	try {
		await writeToClipboard(value);
		new Notice(
			files.length === 1
				? plugin.strings.noticeCopiedPath
				: plugin.strings.noticeCopiedPaths(files.length),
		);
	} catch (error) {
		console.error("Failed to copy vault-relative path", error);
		new Notice(plugin.strings.noticeCopyFailed);
	}
}

function addAppearanceMenuItem(
	plugin: ObsidianFilenameSearchPlugin,
	menu: import("obsidian").Menu,
	file: TAbstractFile,
) {
	menu.addItem((item) => {
		item
			.setTitle(plugin.strings.contextMenuSelectIconAndColor)
			.setIcon("palette")
			.onClick(() => {
				plugin.openItemAppearanceModal(file.path);
			});
	});
}

function addOpenFolderBrowserMenuItem(
	plugin: ObsidianFilenameSearchPlugin,
	menu: import("obsidian").Menu,
	file: TAbstractFile,
) {
	if (!(file instanceof TFolder)) {
		return;
	}

	menu.addItem((item) => {
		item
			.setTitle(plugin.strings.contextMenuOpenFolderBrowser)
			.setIcon("layout-grid")
			.onClick(() => {
				void plugin.openFolderBrowser(file.path);
			});
	});
}

async function writeToClipboard(value: string) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(value);
		return;
	}

	throw new Error("Clipboard API is not available");
}

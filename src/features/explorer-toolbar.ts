import { Component, setIcon, setTooltip, View, WorkspaceLeaf } from "obsidian";
import ObsidianFilenameSearchPlugin, { FILE_NAME_SEARCH_ICON } from "../main";

const FILE_EXPLORER_VIEW_TYPE = "file-explorer";
const TOOLBAR_CLASS = "ofs-explorer-toolbar";
const TOOLBAR_BUTTON_CLASS = "ofs-explorer-toolbar-button";

export class ExplorerToolbarManager extends Component {
	constructor(private readonly plugin: ObsidianFilenameSearchPlugin) {
		super();
	}

	refresh() {
		const explorerLeaves = this.plugin.app.workspace.getLeavesOfType(FILE_EXPLORER_VIEW_TYPE);
		for (const leaf of explorerLeaves) {
			this.mountToolbar(leaf);
		}
	}

	destroy() {
		for (const leaf of this.plugin.app.workspace.getLeavesOfType(FILE_EXPLORER_VIEW_TYPE)) {
			leaf.view.containerEl.querySelector(`.${TOOLBAR_CLASS}`)?.remove();
		}

		this.unload();
	}

	private mountToolbar(leaf: WorkspaceLeaf) {
		const hostEl = this.getToolbarHost(leaf.view);
		if (!hostEl) {
			return;
		}

		let toolbarEl = leaf.view.containerEl.querySelector<HTMLDivElement>(`.${TOOLBAR_CLASS}`);
		if (!toolbarEl) {
			toolbarEl = this.createToolbar();
		}

		if (toolbarEl.parentElement !== hostEl || hostEl.firstElementChild !== toolbarEl) {
			hostEl.prepend(toolbarEl);
		}
	}

	private getToolbarHost(view: View): HTMLElement | null {
		return view.containerEl.querySelector(".view-content") ?? view.containerEl;
	}

	private createToolbar(): HTMLDivElement {
		const toolbarEl = document.createElement("div");
		toolbarEl.className = TOOLBAR_CLASS;
		const searchButton = this.createIconButton(
			this.plugin.strings.explorerToolbarOpenSearch,
			FILE_NAME_SEARCH_ICON,
			() => {
				void this.plugin.activateSearchView("search");
			},
		);
		const folderSizeButton = this.createIconButton(
			this.plugin.strings.explorerToolbarOpenFolderSizes,
			"folder-open",
			() => {
				void this.plugin.activateFolderSizesView();
			},
		);
		const pinnedButton = this.createIconButton(
			this.plugin.strings.explorerToolbarOpenPinned,
			"pin",
			() => {
				void this.plugin.activatePinnedItemsView();
			},
		);
		const cleanupButton = this.createIconButton(
			this.plugin.strings.explorerToolbarCleanupEmptyLines,
			"eraser",
			() => {
				void this.plugin.cleanupActiveMarkdown();
			},
		);

		toolbarEl.append(searchButton);
		toolbarEl.append(folderSizeButton);
		toolbarEl.append(pinnedButton);
		toolbarEl.append(cleanupButton);
		return toolbarEl;
	}

	private createIconButton(label: string, icon: string, onClick: () => void): HTMLButtonElement {
		const buttonEl = document.createElement("button");
		buttonEl.className = `clickable-icon ${TOOLBAR_BUTTON_CLASS}`;
		buttonEl.type = "button";
		buttonEl.setAttribute("aria-label", label);

		setIcon(buttonEl, icon);
		setTooltip(buttonEl, label);
		buttonEl.addEventListener("click", onClick);

		return buttonEl;
	}
}

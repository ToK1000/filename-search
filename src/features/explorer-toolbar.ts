import { Component, Menu, setIcon, setTooltip, View, WorkspaceLeaf } from "obsidian";
import { CALLOUT_TOOLBAR_ICON } from "./callout-tool";
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
		const searchButton = this.createSplitButton(
			this.plugin.strings.explorerToolbarOpenSearch,
			FILE_NAME_SEARCH_ICON,
			() => {
				void this.plugin.activateSearchView("search");
			},
			(menu) => {
				menu.addItem((item) =>
					item
						.setTitle(this.plugin.strings.commandOpenSearch)
						.setIcon(FILE_NAME_SEARCH_ICON)
						.onClick(() => {
							void this.plugin.activateSearchView("search");
						}),
				);
				menu.addItem((item) =>
					item
						.setTitle(this.plugin.strings.explorerToolbarOpenFolderSizes)
						.setIcon("folder-open")
						.onClick(() => {
							void this.plugin.activateFolderSizesView();
						}),
				);
				menu.addItem((item) =>
					item
						.setTitle(this.plugin.strings.explorerToolbarOpenPinned)
						.setIcon("pin")
						.onClick(() => {
							void this.plugin.activatePinnedItemsView();
						}),
				);
			},
		);
		const cleanupButton = this.createSplitButton(
			this.plugin.strings.explorerToolbarCleanupEmptyLines,
			"eraser",
			() => {
				void this.plugin.cleanupActiveMarkdown();
			},
			(menu) => {
				menu.addItem((item) =>
					item
						.setTitle(this.plugin.strings.commandCleanupEmptyLines)
						.setIcon("eraser")
						.onClick(() => {
							void this.plugin.cleanupActiveMarkdown();
						}),
				);
				menu.addItem((item) =>
					item
						.setTitle(this.plugin.strings.commandDemoteHeadings)
						.setIcon("indent-increase")
						.onClick(() => {
							void this.plugin.demoteSelectedHeadings();
						}),
				);
				menu.addItem((item) =>
					item
						.setTitle(this.plugin.strings.commandPromoteHeadings)
						.setIcon("indent-decrease")
						.onClick(() => {
							void this.plugin.promoteSelectedHeadings();
						}),
				);
			},
		);
		const calloutButton = this.createSplitButton(
			this.plugin.strings.explorerToolbarInsertCallout,
			CALLOUT_TOOLBAR_ICON,
			() => {
				this.plugin.openCalloutPicker();
			},
			(menu) => {
				menu.addItem((item) =>
					item
						.setTitle(this.plugin.strings.commandInsertCallout)
						.setIcon(CALLOUT_TOOLBAR_ICON)
						.onClick(() => this.plugin.openCalloutPicker()),
				);
				menu.addItem((item) =>
					item
						.setTitle(this.plugin.strings.commandMergeCalloutsIntoColumns)
						.setIcon("columns-2")
						.onClick(() => {
							void this.plugin.mergeSelectedCalloutsIntoColumns();
						}),
				);
				menu.addItem((item) =>
					item
						.setTitle(this.plugin.strings.commandUnwrapCallouts)
						.setIcon("remove-formatting")
						.onClick(() => {
							void this.plugin.unwrapSelectedCallouts();
						}),
				);
			},
		);

		toolbarEl.append(this.createButtonGroup(this.plugin.strings.explorerToolbarGroupSearch, searchButton));
		toolbarEl.append(this.createGroupSeparator());
		toolbarEl.append(this.createButtonGroup(this.plugin.strings.explorerToolbarGroupFormatting, cleanupButton));
		toolbarEl.append(this.createGroupSeparator());
		toolbarEl.append(this.createButtonGroup(this.plugin.strings.explorerToolbarGroupCallouts, calloutButton));
		return toolbarEl;
	}

	private createIconButton(label: string, icon: string, onClick: () => void): HTMLButtonElement {
		const buttonEl = document.createElement("button");
		buttonEl.className = `clickable-icon ${TOOLBAR_BUTTON_CLASS}`;
		buttonEl.type = "button";
		buttonEl.setAttribute("aria-label", label);

		setIcon(buttonEl, icon);
		setTooltip(buttonEl, label);
		buttonEl.addEventListener("mousedown", (event) => {
			event.preventDefault();
		});
		buttonEl.addEventListener("click", onClick);

		return buttonEl;
	}

	private createSplitButton(
		label: string,
		icon: string,
		onClick: () => void,
		buildMenu: (menu: Menu) => void,
	): HTMLDivElement {
		const groupEl = document.createElement("div");
		groupEl.className = "ofs-toolbar-split";

		const mainButton = this.createIconButton(label, icon, onClick);
		mainButton.classList.add("ofs-toolbar-split-main");

		const menuButton = document.createElement("button");
		menuButton.className = `clickable-icon ${TOOLBAR_BUTTON_CLASS} ofs-toolbar-split-trigger`;
		menuButton.type = "button";
		menuButton.setAttribute("aria-label", label);
		setIcon(menuButton, "chevron-down");
		setTooltip(menuButton, label);
		menuButton.addEventListener("mousedown", (event) => {
			event.preventDefault();
		});
		menuButton.addEventListener("click", (event) => {
			event.preventDefault();
			const menu = new Menu();
			buildMenu(menu);
			const rect = menuButton.getBoundingClientRect();
			menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
		});

		groupEl.append(mainButton, menuButton);
		return groupEl;
	}

	private createGroupSeparator(): HTMLSpanElement {
		const separatorEl = document.createElement("span");
		separatorEl.className = "ofs-toolbar-separator";
		separatorEl.setAttribute("aria-hidden", "true");
		return separatorEl;
	}

	private createButtonGroup(label: string, ...elements: HTMLElement[]): HTMLDivElement {
		const groupEl = document.createElement("div");
		groupEl.className = "ofs-toolbar-group";
		groupEl.setAttribute("aria-label", label);
		setTooltip(groupEl, label);
		groupEl.append(...elements);
		return groupEl;
	}
}

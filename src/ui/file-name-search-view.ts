import { ItemView, Keymap, Menu, setIcon, setTooltip, TFile, WorkspaceLeaf } from "obsidian";
import { CALLOUT_TOOLBAR_ICON } from "../features/callout-tool";
import { FolderSizeNode, formatFolderSize } from "../folders/folder-sizes";
import { getEffectiveItemIconValue, getEffectiveStyle } from "../features/item-icon-source";
import { renderStoredIcon } from "../features/icon-renderer";
import ObsidianFilenameSearchPlugin, { SearchSidebarMode } from "../main";
import { FILE_NAME_SEARCH_ICON } from "../main";
import { searchFiles } from "../search/file-name-search";

const MAX_RESULTS = 100;

export const FILE_NAME_SEARCH_VIEW_TYPE = "file-name-search-view";

export class FileNameSearchView extends ItemView {
	private mode: SearchSidebarMode = "search";
	private headingEl!: HTMLHeadingElement;
	private modeSwitcherEl!: HTMLDivElement;
	private inputEl!: HTMLInputElement;
	private resultsEl!: HTMLDivElement;
	private summaryEl!: HTMLDivElement;
	private descriptionEl!: HTMLDivElement;
	private collapsedFolderPaths = new Set<string>();
	private selectedIndex = 0;
	private query = "";

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: ObsidianFilenameSearchPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return FILE_NAME_SEARCH_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.plugin.strings.viewTitle;
	}

	getIcon(): string {
		return FILE_NAME_SEARCH_ICON;
	}

	async onOpen() {
		this.mode = this.plugin.getSidebarMode();
		this.render();
	}

	async onClose() {
		this.contentEl.empty();
	}

	refresh() {
		if (!this.resultsEl) {
			return;
		}

		this.renderBody();
	}

	focusInput() {
		if (!this.inputEl || this.mode !== "search") {
			return;
		}

		window.setTimeout(() => {
			this.inputEl.focus();
			this.inputEl.select();
		}, 0);
	}

	setMode(mode: SearchSidebarMode) {
		this.mode = mode;
		if (!this.resultsEl) {
			return;
		}

		this.updateModeUi();
		this.renderBody();
		if (mode === "search") {
			this.focusInput();
		}
	}

	private render() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.addClass("ofs-view");

		this.headingEl = contentEl.createEl("h2");
		this.descriptionEl = contentEl.createDiv({ cls: "ofs-description" });
		this.modeSwitcherEl = contentEl.createDiv({ cls: "ofs-explorer-toolbar ofs-tab-toolbar" });
		const searchButton = this.createSplitButton(this.plugin.strings.explorerToolbarOpenSearch, FILE_NAME_SEARCH_ICON, () => {
			void this.plugin.activateSearchView("search");
		}, (menu) => {
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
		}, ["ofs-tab-toolbar-button"], "search-family");
		const cleanupButton = this.createSplitButton(this.plugin.strings.explorerToolbarCleanupEmptyLines, "eraser", () => {
			void this.plugin.cleanupActiveMarkdown();
		}, (menu) => {
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
		});
		const calloutButton = this.createSplitButton(this.plugin.strings.explorerToolbarInsertCallout, CALLOUT_TOOLBAR_ICON, () => {
			this.plugin.openCalloutPicker();
		}, (menu) => {
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
		});
		this.createButtonGroup(this.plugin.strings.explorerToolbarGroupSearch, searchButton);
		this.createGroupSeparator();
		this.createButtonGroup(this.plugin.strings.explorerToolbarGroupFormatting, cleanupButton);
		this.createGroupSeparator();
		this.createButtonGroup(this.plugin.strings.explorerToolbarGroupCallouts, calloutButton);

		this.inputEl = contentEl.createEl("input", {
			type: "text",
			placeholder: this.plugin.strings.searchPlaceholder,
			cls: "ofs-input",
		});

		this.summaryEl = contentEl.createDiv({ cls: "ofs-summary" });
		this.resultsEl = contentEl.createDiv({ cls: "ofs-results" });

		this.inputEl.addEventListener("input", () => {
			this.query = this.inputEl.value;
			this.selectedIndex = 0;
			this.renderResults();
		});

		this.inputEl.addEventListener("keydown", (event) => {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				this.moveSelection(1);
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				this.moveSelection(-1);
				return;
			}

			if (event.key === "Enter") {
				event.preventDefault();
				const selectedFile = this.getVisibleResults()[this.selectedIndex];
				if (selectedFile) {
					void this.openFile(selectedFile, event);
				}
			}
		});

		this.addAction("cross", this.plugin.strings.clearSearch, () => {
			this.inputEl.value = "";
			this.query = "";
			this.selectedIndex = 0;
			this.renderResults();
			this.inputEl.focus();
		});

		this.updateModeUi();
		this.renderBody();
		this.focusInput();
	}

	private renderBody() {
		this.headingEl.setText(
			this.mode === "folder-sizes"
				? this.plugin.strings.folderSizesHeading
				: this.mode === "pinned"
					? this.plugin.strings.pinnedHeading
					: this.plugin.strings.searchHeading,
		);

		if (this.mode === "folder-sizes") {
			this.renderFolderSizes();
			return;
		}

		if (this.mode === "pinned") {
			void this.renderPinnedItems();
			return;
		}

		this.renderResults();
	}

	private renderResults() {
		this.inputEl.removeClass("is-hidden");
		this.descriptionEl.setText(this.plugin.strings.searchDescription);
		this.inputEl.value = this.query;

		const visibleResults = this.getVisibleResults();
		const allMatches = searchFiles(this.plugin.getFiles(), this.query);

		this.resultsEl.empty();

		if (visibleResults.length === 0) {
			this.summaryEl.setText(this.plugin.strings.noMatchesTitle);
			this.resultsEl.createDiv({
				text: this.plugin.strings.noMatchesDescription,
				cls: "ofs-empty",
			});
			return;
		}

		this.selectedIndex = Math.min(this.selectedIndex, visibleResults.length - 1);
		this.summaryEl.setText(
			allMatches.length > MAX_RESULTS
				? this.plugin.strings.resultsShowing(visibleResults.length, allMatches.length)
				: this.plugin.strings.resultsCount(visibleResults.length),
		);

		visibleResults.forEach((file, index) => {
			const isPinned = this.plugin.isPinnedGlobally(file.path);
			const row = this.resultsEl.createDiv({
				cls: `ofs-result-item${index === this.selectedIndex ? " is-selected" : ""}`,
				title: this.plugin.strings.resultTooltip,
			});

			const main = row.createDiv({ cls: "ofs-result-main" });

			main.createDiv({
				text: file.basename,
				cls: "ofs-result-name",
			});

			if (this.plugin.settings.showModifiedDate) {
				const meta = main.createDiv({ cls: "ofs-result-meta" });
				meta.setText(this.plugin.strings.modifiedLabel(formatDate(file.stat.mtime)));
			}

			if (this.plugin.settings.showPath) {
				main.createDiv({
					text: file.path,
					cls: "ofs-result-path",
				});
			}

			const pinButton = row.createEl("button", {
				cls: `ofs-result-pin clickable-icon${isPinned ? " is-active" : ""}`,
				attr: {
					type: "button",
					"aria-label": isPinned ? this.plugin.strings.searchResultUnpin : this.plugin.strings.searchResultPin,
				},
			});
			setIcon(pinButton, "pin");
			setTooltip(pinButton, isPinned ? this.plugin.strings.searchResultUnpin : this.plugin.strings.searchResultPin);
			pinButton.addEventListener("mousedown", (event) => {
				event.preventDefault();
				event.stopPropagation();
			});
			pinButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				void this.plugin.togglePinnedGlobally(file.path);
			});

			row.addEventListener("mouseenter", () => {
				this.setSelectedIndex(index);
			});

			row.addEventListener("mousedown", (event) => {
				if ((event.target as HTMLElement | null)?.closest(".ofs-result-pin")) {
					return;
				}
				event.preventDefault();
				this.setSelectedIndex(index);
				void this.openFile(file, event);
			});
		});
	}

	private getVisibleResults(): TFile[] {
		return searchFiles(this.plugin.getFiles(), this.query)
			.slice(0, MAX_RESULTS)
			.map((result) => result.file);
	}

	private renderFolderSizes() {
		this.inputEl.addClass("is-hidden");
		this.descriptionEl.setText(this.plugin.strings.folderSizesDescription);
		this.resultsEl.empty();

		const folderTree = this.plugin.getFolderSizeTree();
		const totalVaultSize = this.plugin.getTotalVaultSizeBytes();
		const calculatedAt = this.plugin.getFolderSizeCalculatedAt();
		this.summaryEl.setText(
			calculatedAt
				? this.plugin.strings.folderSizesSummary(folderTree.length, formatFolderSize(totalVaultSize), formatDate(calculatedAt))
				: this.plugin.strings.folderSizesNotCalculated,
		);

		const actionsEl = this.resultsEl.createDiv({ cls: "ofs-folder-size-actions" });
		const refreshButton = actionsEl.createEl("button", {
			text: this.plugin.strings.folderSizesRefresh,
			cls: "mod-cta",
			attr: { type: "button" },
		});
		refreshButton.addEventListener("click", () => {
			this.plugin.calculateFolderSizes();
		});

		if (folderTree.length === 0) {
			this.resultsEl.createDiv({
				text: this.plugin.strings.folderSizesEmpty,
				cls: "ofs-empty",
			});
			return;
		}

		const treeEl = this.resultsEl.createDiv({ cls: "ofs-folder-tree" });
		const rootNode: FolderSizeNode = {
			path: "/",
			name: this.plugin.strings.folderSizesRootLabel,
			sizeBytes: totalVaultSize,
			fileCount: this.plugin.getFiles().length,
			children: folderTree,
		};
		this.renderFolderSizeNode(treeEl, rootNode, 0);
	}

	private async renderPinnedItems() {
		this.inputEl.addClass("is-hidden");
		this.descriptionEl.setText(this.plugin.strings.pinnedDescription);
		this.resultsEl.empty();

		const pinnedFiles = this.plugin.getPinnedFiles();
		this.summaryEl.setText(this.plugin.strings.pinnedSummary(pinnedFiles.length));

		if (pinnedFiles.length === 0) {
			this.resultsEl.createDiv({
				text: this.plugin.strings.pinnedEmpty,
				cls: "ofs-empty",
			});
			return;
		}

		for (const file of pinnedFiles) {
			const row = this.resultsEl.createDiv({
				cls: "ofs-pinned-item",
				attr: { title: file.path },
			});
			const effectiveStyle = getEffectiveStyle(this.plugin.settings.explorerStyleRules, file.path);
			if (effectiveStyle?.textColor) {
				row.style.setProperty("--ofs-folder-text-color", effectiveStyle.textColor);
			}
			if (effectiveStyle?.backgroundColor) {
				row.style.setProperty("--ofs-folder-background-color", effectiveStyle.backgroundColor);
			}
			if (effectiveStyle?.iconColor) {
				row.style.setProperty("--ofs-folder-icon-color", effectiveStyle.iconColor);
			}
			if (effectiveStyle?.iconBackgroundColor) {
				row.style.setProperty("--ofs-folder-icon-background-color", effectiveStyle.iconBackgroundColor);
			}

			const iconEl = row.createDiv({ cls: "ofs-pinned-item-icon" });
			await renderStoredIcon(
				this.plugin,
				iconEl,
				getEffectiveItemIconValue(this.plugin, file, effectiveStyle),
				"file",
			);

			const bodyEl = row.createDiv({ cls: "ofs-pinned-item-body" });
			bodyEl.createDiv({
				text: file.basename,
				cls: "ofs-pinned-item-name",
			});
			bodyEl.createDiv({
				text: file.path,
				cls: "ofs-pinned-item-path",
			});

			const removeButton = row.createEl("button", {
				cls: "ofs-pinned-item-remove clickable-icon",
				attr: { type: "button", "aria-label": this.plugin.strings.pinnedRemove },
			});
			setIcon(removeButton, "pin-off");
			setTooltip(removeButton, this.plugin.strings.pinnedRemove);
			removeButton.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				void this.plugin.removePinnedEverywhere(file.path);
			});

			row.addEventListener("mousedown", (event) => {
				if ((event.target as HTMLElement | null)?.closest(".ofs-pinned-item-remove")) {
					return;
				}
				event.preventDefault();
				void this.openFile(file, event);
			});
		}
	}

	private renderFolderSizeNode(parentEl: HTMLElement, node: FolderSizeNode, depth: number) {
		const hasChildren = node.children.length > 0;
		const isCollapsed = this.collapsedFolderPaths.has(node.path);
		const rowEl = parentEl.createDiv({ cls: "ofs-folder-tree-row" });
		rowEl.style.setProperty("--ofs-folder-depth", String(depth));

		const nameEl = rowEl.createDiv({ cls: "ofs-folder-tree-name" });
		if (hasChildren) {
			const toggleEl = nameEl.createEl("button", {
				text: isCollapsed ? ">" : "v",
				cls: "ofs-folder-tree-toggle",
				attr: { type: "button", "aria-label": node.name },
			});
			toggleEl.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.toggleFolderNode(node.path);
			});
		} else {
			nameEl.createSpan({ cls: "ofs-folder-tree-toggle-spacer", text: " " });
		}

		nameEl.createSpan({ text: node.name });
		rowEl.createDiv({
			text: `(${node.fileCount}) ${formatFolderSize(node.sizeBytes)}`,
			cls: "ofs-folder-tree-size",
		});

		if (isCollapsed) {
			return;
		}

		for (const child of node.children) {
			this.renderFolderSizeNode(parentEl, child, depth + 1);
		}
	}

	private toggleFolderNode(path: string) {
		if (this.collapsedFolderPaths.has(path)) {
			this.collapsedFolderPaths.delete(path);
		} else {
			this.collapsedFolderPaths.add(path);
		}

		this.renderFolderSizes();
	}

	private createModeButton(label: string, mode: SearchSidebarMode, icon: string): HTMLButtonElement {
		const buttonEl = document.createElement("button");
		buttonEl.addClasses(["clickable-icon", "ofs-explorer-toolbar-button", "ofs-tab-toolbar-button"]);
		buttonEl.type = "button";
		setIcon(buttonEl, icon);
		buttonEl.setAttribute("aria-label", label);
		buttonEl.setAttribute("title", label);
		buttonEl.addEventListener("mousedown", (event) => {
			event.preventDefault();
		});
		buttonEl.addEventListener("click", () => {
			if (mode === "folder-sizes") {
				void this.plugin.activateFolderSizesView();
				return;
			}

			if (mode === "pinned") {
				void this.plugin.activatePinnedItemsView();
				return;
			}

			void this.plugin.activateSearchView(mode);
		});
		return buttonEl;
	}

	private updateModeUi() {
		this.modeSwitcherEl.querySelectorAll<HTMLButtonElement>(".ofs-tab-toolbar-button").forEach((buttonEl) => {
			const isActive = buttonEl.dataset.modeGroup === "search-family"
				&& (this.mode === "search" || this.mode === "folder-sizes" || this.mode === "pinned");
			buttonEl.toggleClass("is-active", isActive);
			buttonEl.toggleClass("mod-cta", isActive);
		});
	}

	private createActionButton(label: string, icon: string, onClick: () => void): HTMLButtonElement {
		const buttonEl = document.createElement("button");
		buttonEl.addClasses(["clickable-icon", "ofs-explorer-toolbar-button"]);
		buttonEl.type = "button";
		buttonEl.setAttribute("aria-label", label);
		buttonEl.setAttribute("title", label);
		setIcon(buttonEl, icon);
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
		mainButtonClasses: string[] = [],
		modeGroup?: string,
	): HTMLDivElement {
		const groupEl = document.createElement("div");
		groupEl.className = "ofs-toolbar-split";
		const mainButton = document.createElement("button");
		mainButton.addClasses(["clickable-icon", "ofs-explorer-toolbar-button", "ofs-toolbar-split-main", ...mainButtonClasses]);
		mainButton.type = "button";
		mainButton.setAttribute("aria-label", label);
		mainButton.setAttribute("title", label);
		if (modeGroup) {
			mainButton.dataset.modeGroup = modeGroup;
		}
		setIcon(mainButton, icon);
		mainButton.addEventListener("mousedown", (event) => {
			event.preventDefault();
		});
		mainButton.addEventListener("click", onClick);

		const menuButton = document.createElement("button");
		menuButton.addClasses(["clickable-icon", "ofs-explorer-toolbar-button", "ofs-toolbar-split-trigger"]);
		menuButton.type = "button";
		menuButton.setAttribute("aria-label", label);
		menuButton.setAttribute("title", label);
		setIcon(menuButton, "chevron-down");
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

	private createGroupSeparator() {
		const separatorEl = this.modeSwitcherEl.createSpan({ cls: "ofs-toolbar-separator" });
		separatorEl.setAttribute("aria-hidden", "true");
	}

	private createButtonGroup(label: string, ...elements: HTMLElement[]) {
		const groupEl = this.modeSwitcherEl.createDiv({ cls: "ofs-toolbar-group" });
		groupEl.setAttribute("aria-label", label);
		setTooltip(groupEl, label);
		groupEl.append(...elements);
	}

	private moveSelection(offset: number) {
		const visibleResults = this.getVisibleResults();
		if (visibleResults.length === 0) {
			return;
		}

		const lastIndex = visibleResults.length - 1;
		this.selectedIndex = Math.min(lastIndex, Math.max(0, this.selectedIndex + offset));
		this.renderResults();
		this.scrollSelectedResultIntoView();
	}

	private setSelectedIndex(index: number) {
		if (index === this.selectedIndex) {
			return;
		}

		this.selectedIndex = index;
		this.renderResults();
	}

	private scrollSelectedResultIntoView() {
		const selectedEl = this.resultsEl.children[this.selectedIndex];
		if (selectedEl instanceof HTMLElement) {
			selectedEl.scrollIntoView({ block: "nearest" });
		}
	}

	private async openFile(file: TFile, event?: MouseEvent | KeyboardEvent) {
		const paneTarget = Keymap.isModEvent(event);
		const leaf = paneTarget
			? this.app.workspace.getLeaf(paneTarget)
			: this.app.workspace.getMostRecentLeaf() ?? this.app.workspace.getLeaf(false);

		await leaf.openFile(file);
	}
}

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleString();
}

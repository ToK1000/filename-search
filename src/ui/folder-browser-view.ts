import { ItemView, Menu, setIcon, TAbstractFile, TFile, TFolder, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { getEffectiveItemIconValue, getEffectiveStyle } from "../features/item-icon-source";
import { renderStoredIcon } from "../features/icon-renderer";
import { FolderBrowserSortMode } from "../settings";
import ObsidianFilenameSearchPlugin, { FILE_NAME_SEARCH_ICON } from "../main";

export const FOLDER_BROWSER_VIEW_TYPE = "folder-browser-view";

const IMAGE_EXTENSIONS = new Set([
	"avif",
	"bmp",
	"gif",
	"jpeg",
	"jpg",
	"png",
	"svg",
	"webp",
]);

type FolderBrowserLeafState = {
	folderPath?: string;
	recursive?: boolean;
};

type BrowserItemKind = "folder" | "note" | "image" | "file";

type BrowserItem = {
	file: TAbstractFile;
	kind: BrowserItemKind;
	isPinned: boolean;
};

export class FolderBrowserView extends ItemView {
	private folderPath = "";
	private recursive = false;
	private headingEl!: HTMLHeadingElement;
	private pathEl!: HTMLDivElement;
	private descriptionEl!: HTMLDivElement;
	private toolbarEl!: HTMLDivElement;
	private sortSelectEl!: HTMLSelectElement;
	private recursiveToggleEl!: HTMLInputElement;
	private contentContainerEl!: HTMLDivElement;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: ObsidianFilenameSearchPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return FOLDER_BROWSER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.plugin.strings.folderBrowserViewTitle;
	}

	getIcon(): string {
		return FILE_NAME_SEARCH_ICON;
	}

	async onOpen() {
		this.renderShell();
		await this.refresh();
	}

	async onClose() {
		this.contentEl.empty();
	}

	getState(): FolderBrowserLeafState {
		return {
			folderPath: this.folderPath,
			recursive: this.recursive,
		};
	}

	async setState(state: unknown, result: ViewStateResult) {
		const nextState = (state ?? {}) as FolderBrowserLeafState;
		this.folderPath = nextState.folderPath ?? "";
		this.recursive = nextState.recursive ?? false;
		await super.setState(state, result);
		await this.refresh();
	}

	async refresh() {
		if (!this.contentContainerEl) {
			return;
		}

		this.renderContent();
	}

	private renderShell() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ofs-view", "ofs-folder-browser-view");

		this.headingEl = contentEl.createEl("h2");
		this.pathEl = contentEl.createDiv({ cls: "ofs-description ofs-folder-browser-path" });
		this.descriptionEl = contentEl.createDiv({ cls: "ofs-description" });

		this.toolbarEl = contentEl.createDiv({ cls: "ofs-folder-browser-toolbar" });
		const sortWrapEl = this.toolbarEl.createDiv({ cls: "ofs-folder-browser-sort" });
		sortWrapEl.createSpan({
			text: this.plugin.strings.folderBrowserSortLabel,
			cls: "ofs-folder-browser-sort-label",
		});
		this.sortSelectEl = sortWrapEl.createEl("select", { cls: "dropdown" });
		this.createSortOption("alphabetical", this.plugin.strings.folderBrowserSortAlphabetical);
		this.createSortOption("modified", this.plugin.strings.folderBrowserSortModified);
		this.createSortOption("pinned", this.plugin.strings.folderBrowserSortPinned);
		this.sortSelectEl.addEventListener("change", () => {
			void this.plugin.setFolderSortMode(this.folderPath, this.sortSelectEl.value as FolderBrowserSortMode);
		});

		const navActionsEl = this.toolbarEl.createDiv({ cls: "ofs-folder-browser-nav-actions" });
		const upButton = navActionsEl.createEl("button", {
			cls: "clickable-icon",
			attr: {
				type: "button",
				"aria-label": this.plugin.strings.folderBrowserNavigateUp,
				title: this.plugin.strings.folderBrowserNavigateUp,
			},
		});
		setIcon(upButton, "arrow-up");
		upButton.addEventListener("click", () => {
			void this.plugin.openFolderBrowser(getParentFolderPath(this.folderPath));
		});

		const openRootButton = this.toolbarEl.createEl("button", {
			text: this.plugin.strings.folderBrowserOpenRoot,
			cls: "mod-cta",
			attr: { type: "button" },
		});
		openRootButton.addEventListener("click", () => {
			void this.plugin.openFolderBrowser("");
		});
		navActionsEl.append(openRootButton);

		const recursiveWrapEl = navActionsEl.createEl("label", { cls: "ofs-folder-browser-recursive-toggle" });
		this.recursiveToggleEl = recursiveWrapEl.createEl("input", {
			type: "checkbox",
		});
		recursiveWrapEl.createSpan({ text: this.plugin.strings.folderBrowserRecursiveToggle });
		this.recursiveToggleEl.addEventListener("change", () => {
			this.recursive = this.recursiveToggleEl.checked;
			void this.leaf.setViewState({
				...this.leaf.getViewState(),
				state: this.getState(),
			});
		});

		this.contentContainerEl = contentEl.createDiv({ cls: "ofs-folder-browser-content" });
	}

	private renderContent() {
		const folder = this.getCurrentFolder();
		const folderName = this.folderPath ? folder?.name ?? this.folderPath : this.plugin.strings.folderBrowserRootLabel;
		const folderState = this.plugin.getFolderViewState(this.folderPath);
		const upButton = this.toolbarEl.querySelector(".clickable-icon");
		if (upButton instanceof HTMLButtonElement) {
			upButton.disabled = this.folderPath === "";
		}

		this.headingEl.setText(`${this.plugin.strings.folderBrowserHeading}: ${folderName}`);
		this.pathEl.setText(this.folderPath || "/");
		this.descriptionEl.setText(this.plugin.strings.folderBrowserDescription);
		this.sortSelectEl.value = folderState.sortMode;
		this.recursiveToggleEl.checked = this.recursive;
		this.contentContainerEl.empty();

		if (!folder) {
			this.contentContainerEl.createDiv({
				text: this.plugin.strings.folderBrowserFolderMissing,
				cls: "ofs-empty",
			});
			return;
		}

		const items = this.getSortedItems(folder, folderState.sortMode);
		if (items.length === 0) {
			this.contentContainerEl.createDiv({
				text: this.plugin.strings.folderBrowserEmpty,
				cls: "ofs-empty",
			});
			return;
		}

		const groupedItems = new Map<BrowserItemKind, BrowserItem[]>([
			["folder", []],
			["note", []],
			["image", []],
			["file", []],
		]);
		const pinnedItems: BrowserItem[] = [];

		for (const item of items) {
			if (item.isPinned) {
				pinnedItems.push(item);
				continue;
			}

			groupedItems.get(item.kind)?.push(item);
		}

		if (pinnedItems.length > 0) {
			const pinnedSectionEl = this.contentContainerEl.createDiv({ cls: "ofs-folder-browser-section" });
			pinnedSectionEl.createEl("h3", {
				text: `${this.plugin.strings.folderBrowserSectionPinned} (${pinnedItems.length})`,
				cls: "ofs-folder-browser-section-title",
			});
			const pinnedGridEl = pinnedSectionEl.createDiv({ cls: "ofs-folder-browser-grid" });
			for (const item of pinnedItems) {
				this.renderCard(pinnedGridEl, item);
			}
		}

		this.renderSection("folder", this.plugin.strings.folderBrowserSectionFolders, groupedItems);
		this.renderSection("note", this.plugin.strings.folderBrowserSectionNotes, groupedItems);
		this.renderSection("image", this.plugin.strings.folderBrowserSectionImages, groupedItems);
		this.renderSection("file", this.plugin.strings.folderBrowserSectionFiles, groupedItems);
	}

	private renderSection(kind: BrowserItemKind, title: string, groupedItems: Map<BrowserItemKind, BrowserItem[]>) {
		const items = groupedItems.get(kind) ?? [];
		if (items.length === 0) {
			return;
		}

		const sectionEl = this.contentContainerEl.createDiv({ cls: "ofs-folder-browser-section" });
		sectionEl.createEl("h3", {
			text: `${title} (${items.length})`,
			cls: "ofs-folder-browser-section-title",
		});
		const gridEl = sectionEl.createDiv({ cls: "ofs-folder-browser-grid" });

		for (const item of items) {
			this.renderCard(gridEl, item);
		}
	}

	private renderCard(parentEl: HTMLElement, item: BrowserItem) {
		const cardEl = parentEl.createDiv({
			cls: `ofs-folder-browser-card is-${item.kind}${item.isPinned ? " is-pinned" : ""}`,
		});
		const effectiveStyle = getEffectiveStyle(this.plugin.settings.explorerStyleRules, item.file.path);
		applyCardRule(cardEl, effectiveStyle);

		const headerEl = cardEl.createDiv({ cls: "ofs-folder-browser-card-header" });
		const titleWrapEl = headerEl.createDiv({ cls: "ofs-folder-browser-card-title-wrap" });
		const iconEl = titleWrapEl.createDiv({ cls: "ofs-folder-browser-card-icon" });
		void renderStoredIcon(
			this.plugin,
			iconEl,
			getEffectiveItemIconValue(this.plugin, item.file, effectiveStyle),
			getFallbackIcon(item.kind),
		);

		titleWrapEl.createDiv({
			text: getDisplayName(item.file, item.kind),
			cls: "ofs-folder-browser-card-title",
			attr: { title: item.file.path },
		});

		const pinButton = headerEl.createEl("button", {
			cls: `ofs-folder-browser-pin${item.isPinned ? " is-active" : ""}`,
			attr: {
				type: "button",
				"aria-label": item.isPinned ? this.plugin.strings.folderBrowserUnpin : this.plugin.strings.folderBrowserPin,
				title: item.isPinned ? this.plugin.strings.folderBrowserUnpin : this.plugin.strings.folderBrowserPin,
			},
		});
		setIcon(pinButton, "pin");
		pinButton.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			void this.plugin.togglePinnedInFolder(this.folderPath, item.file.path);
		});

		if (item.kind === "image" && item.file instanceof TFile) {
			const previewEl = cardEl.createDiv({ cls: "ofs-folder-browser-image-preview" });
			previewEl.createEl("img", {
				cls: "ofs-folder-browser-image",
				attr: {
					src: this.plugin.app.vault.getResourcePath(item.file),
					alt: item.file.basename,
					loading: "lazy",
				},
			});
		} else {
			cardEl.createDiv({
				text: this.getCardPreview(item.file, item.kind),
				cls: "ofs-folder-browser-card-preview",
			});
		}

		const metaEl = cardEl.createDiv({ cls: "ofs-folder-browser-card-meta" });
		metaEl.createSpan({ text: this.getKindLabel(item.kind) });
		if (this.recursive) {
			metaEl.createSpan({ text: getRelativeParentPath(this.folderPath, item.file.path) });
		}
		if (item.file instanceof TFile) {
			metaEl.createSpan({ text: formatModified(item.file.stat.mtime) });
		}

		cardEl.addEventListener("click", () => {
			void this.openItem(item.file);
		});
		cardEl.addEventListener("contextmenu", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.openContextMenu(event, item.file);
		});

		if (item.kind === "note" && item.file instanceof TFile) {
			void this.populateNotePreview(cardEl, item.file);
		}
	}

	private openContextMenu(event: MouseEvent, file: TAbstractFile) {
		const menu = new Menu();
		this.app.workspace.trigger("file-menu", menu, file, "folder-browser", this.leaf);
		menu.showAtMouseEvent(event);
	}

	private async populateNotePreview(cardEl: HTMLElement, file: TFile) {
		const previewEl = cardEl.querySelector(".ofs-folder-browser-card-preview");
		if (!(previewEl instanceof HTMLDivElement)) {
			return;
		}

		try {
			const content = await this.plugin.app.vault.cachedRead(file);
			if (!previewEl.isConnected) {
				return;
			}

			const preview = toPreviewText(content);
			if (preview.length > 0) {
				previewEl.setText(preview);
			}
		} catch (error) {
			console.error("Could not read note preview", error);
		}
	}

	private async openItem(item: TAbstractFile) {
		if (item instanceof TFolder) {
			await this.plugin.openFolderBrowser(item.path);
			return;
		}

		if (!(item instanceof TFile)) {
			return;
		}

		const leaf = this.app.workspace.getMostRecentLeaf() ?? this.app.workspace.getLeaf("tab");
		await leaf.openFile(item, { active: true });
		this.app.workspace.setActiveLeaf(leaf, { focus: true });
	}

	private getCurrentFolder(): TFolder | null {
		if (this.folderPath === "") {
			return this.app.vault.getRoot();
		}

		const folder = this.app.vault.getAbstractFileByPath(this.folderPath);
		return folder instanceof TFolder ? folder : null;
	}

	private getSortedItems(folder: TFolder, sortMode: FolderBrowserSortMode): BrowserItem[] {
		const sourceFiles = this.recursive ? collectDescendants(folder) : folder.children;
		const items = sourceFiles.map((file) => ({
			file,
			kind: getItemKind(file),
			isPinned: this.plugin.isPinnedInFolder(this.folderPath, file.path),
		}));

		return items.sort((left, right) => {
			if (left.isPinned !== right.isPinned) {
				return left.isPinned ? -1 : 1;
			}

			if (left.kind !== right.kind) {
				return kindWeight(left.kind) - kindWeight(right.kind);
			}

			if (sortMode === "modified") {
				const leftMtime = left.file instanceof TFile ? left.file.stat.mtime : 0;
				const rightMtime = right.file instanceof TFile ? right.file.stat.mtime : 0;
				if (rightMtime !== leftMtime) {
					return rightMtime - leftMtime;
				}
			}

			return left.file.name.localeCompare(right.file.name, undefined, { sensitivity: "base" });
		});
	}

	private getCardPreview(file: TAbstractFile, kind: BrowserItemKind): string {
		if (kind === "folder" && file instanceof TFolder) {
			return this.plugin.strings.folderBrowserFolderPreview(file.children.length);
		}

		if (file instanceof TFile) {
			if (kind === "note") {
				return this.plugin.strings.folderBrowserNotePreviewPlaceholder;
			}

			if (kind === "file") {
				return `${file.extension.toUpperCase()} • ${formatBytes(file.stat.size)}`;
			}
		}

		return "";
	}

	private getKindLabel(kind: BrowserItemKind): string {
		switch (kind) {
			case "folder":
				return this.plugin.strings.itemTypeFolder;
			case "note":
				return this.plugin.strings.folderBrowserKindNote;
			case "image":
				return this.plugin.strings.folderBrowserKindImage;
			default:
				return this.plugin.strings.itemTypeFile;
		}
	}

	private createSortOption(value: FolderBrowserSortMode, label: string) {
		this.sortSelectEl.createEl("option", { value, text: label });
	}
}

function getItemKind(file: TAbstractFile): BrowserItemKind {
	if (file instanceof TFolder) {
		return "folder";
	}

	if (file instanceof TFile && file.extension === "md") {
		return "note";
	}

	if (file instanceof TFile && IMAGE_EXTENSIONS.has(file.extension.toLowerCase())) {
		return "image";
	}

	return "file";
}

function kindWeight(kind: BrowserItemKind): number {
	switch (kind) {
		case "folder":
			return 0;
		case "note":
			return 1;
		case "image":
			return 2;
		default:
			return 3;
	}
}

function toPreviewText(content: string): string {
	const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, "");
	return withoutFrontmatter
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/^#+\s+/gm, "")
		.replace(/\[\[([^\]]+)\]\]/g, "$1")
		.replace(/[*_`>#-]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 180);
}

function formatModified(timestamp: number): string {
	return new Intl.DateTimeFormat(undefined, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(timestamp);
}

function formatBytes(size: number): string {
	if (size >= 1024 * 1024) {
		return `${(size / (1024 * 1024)).toFixed(1)} MB`;
	}

	if (size >= 1024) {
		return `${Math.round(size / 1024)} kB`;
	}

	return `${size} B`;
}

function getDisplayName(file: TAbstractFile, kind: BrowserItemKind): string {
	if (file instanceof TFile && kind === "note") {
		return file.basename;
	}

	return file.name;
}

function getFallbackIcon(kind: BrowserItemKind): string {
	switch (kind) {
		case "folder":
			return "folder";
		case "note":
			return "file-text";
		case "image":
			return "image";
		default:
			return "file";
	}
}

function getParentFolderPath(folderPath: string): string {
	if (!folderPath.includes("/")) {
		return "";
	}

	return folderPath.slice(0, folderPath.lastIndexOf("/"));
}

function collectDescendants(folder: TFolder): TAbstractFile[] {
	const descendants: TAbstractFile[] = [];

	for (const child of folder.children) {
		descendants.push(child);
		if (child instanceof TFolder) {
			descendants.push(...collectDescendants(child));
		}
	}

	return descendants;
}

function getRelativeParentPath(basePath: string, itemPath: string): string {
	const parentPath = itemPath.includes("/") ? itemPath.slice(0, itemPath.lastIndexOf("/")) : "";
	if (parentPath === basePath || parentPath === "") {
		return "/";
	}

	if (basePath && parentPath.startsWith(`${basePath}/`)) {
		return parentPath.slice(basePath.length + 1);
	}

	return parentPath;
}

function applyCardRule(
	cardEl: HTMLElement,
	rule: {
		textColor: string | null;
		backgroundColor: string | null;
		iconColor: string | null;
		iconBackgroundColor: string | null;
	} | null,
) {
	if (!rule) {
		return;
	}

	if (rule.textColor) {
		cardEl.style.setProperty("--ofs-folder-text-color", rule.textColor);
	}

	if (rule.backgroundColor) {
		cardEl.style.setProperty("--ofs-folder-background-color", rule.backgroundColor);
	}

	if (rule.iconColor) {
		cardEl.style.setProperty("--ofs-folder-icon-color", rule.iconColor);
	}

	if (rule.iconBackgroundColor) {
		cardEl.style.setProperty("--ofs-folder-icon-background-color", rule.iconBackgroundColor);
	}
}

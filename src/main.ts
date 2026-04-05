import { addIcon, Plugin, TFile } from "obsidian";
import { cleanupActiveMarkdownFile } from "./features/cleanup-empty-lines";
import { ExplorerFolderStyleManager } from "./features/explorer-folder-styles";
import { registerVaultPathContextMenu } from "./features/file-context-menu";
import { ItemAppearanceModal } from "./features/item-appearance-modal";
import { ExplorerToolbarManager } from "./features/explorer-toolbar";
import { buildFolderSizeTree, FolderSizeNode } from "./folders/folder-sizes";
import { getStrings } from "./i18n";
import {
	ColorHistoryCategory,
	ColorHistoryBucket,
	DEFAULT_SETTINGS,
	ExplorerItemStyleRule,
	FolderBrowserSortMode,
	FolderViewState,
	FilenameSearchSettings,
	FilenameSearchSettingTab,
	normalizeColorHistory,
	normalizeCleanupSettings,
	normalizeExplorerItemStyleRule,
	normalizeFolderViewState,
	normalizeFolderViewStates,
} from "./settings";
import { FOLDER_BROWSER_VIEW_TYPE, FolderBrowserView } from "./ui/folder-browser-view";
import { FILE_NAME_SEARCH_VIEW_TYPE, FileNameSearchView } from "./ui/file-name-search-view";

const OPEN_SEARCH_COMMAND_ID = "open-file-name-search";
const OPEN_FOLDER_BROWSER_COMMAND_ID = "open-folder-browser";
const CLEANUP_EMPTY_LINES_COMMAND_ID = "cleanup-duplicate-empty-lines";
export const FILE_NAME_SEARCH_ICON = "ofs-file-search";
export type SearchSidebarMode = "search" | "folder-sizes" | "pinned";

export default class ObsidianFilenameSearchPlugin extends Plugin {
	private files: TFile[] = [];
	private currentSidebarMode: SearchSidebarMode = "search";
	private folderSizeTree: FolderSizeNode[] = [];
	private totalVaultSizeBytes = 0;
	private folderSizeCalculatedAt: number | null = null;
	private explorerFolderStyleManager!: ExplorerFolderStyleManager;
	private explorerToolbarManager!: ExplorerToolbarManager;
	settings: FilenameSearchSettings = DEFAULT_SETTINGS;
	readonly strings = getStrings();

	async onload() {
		this.registerIcons();
		await this.loadSettings();
		this.refreshFiles();
		this.explorerFolderStyleManager = new ExplorerFolderStyleManager(this);
		this.explorerToolbarManager = new ExplorerToolbarManager(this);

		this.registerView(
			FILE_NAME_SEARCH_VIEW_TYPE,
			(leaf) => new FileNameSearchView(leaf, this),
		);
		this.registerView(
			FOLDER_BROWSER_VIEW_TYPE,
			(leaf) => new FolderBrowserView(leaf, this),
		);

		this.addCommand({
			id: OPEN_SEARCH_COMMAND_ID,
			name: this.strings.commandOpenSearch,
			callback: () => {
				void this.activateSearchView();
			},
		});
		this.addCommand({
			id: OPEN_FOLDER_BROWSER_COMMAND_ID,
			name: this.strings.commandOpenFolderBrowser,
			callback: () => {
				void this.openFolderBrowser(this.app.workspace.getActiveFile()?.parent?.path ?? "");
			},
		});
		this.addCommand({
			id: CLEANUP_EMPTY_LINES_COMMAND_ID,
			name: this.strings.commandCleanupEmptyLines,
			callback: () => {
				void this.cleanupActiveMarkdown();
			},
		});

		this.addSettingTab(new FilenameSearchSettingTab(this.app, this));
		registerVaultPathContextMenu(this);

		this.app.workspace.onLayoutReady(() => {
			void this.initView();
			this.explorerFolderStyleManager.refresh();
			this.explorerToolbarManager.refresh();
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				const view = leaf?.view;
				if (view instanceof FileNameSearchView) {
					view.focusInput();
				}
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.explorerFolderStyleManager.refresh();
				this.explorerToolbarManager.refresh();
			}),
		);

		this.registerEvent(
			this.app.workspace.on("css-change", () => {
				this.explorerFolderStyleManager.refresh();
				this.explorerToolbarManager.refresh();
			}),
		);

		this.registerDomEvent(document, "click", (event) => {
			void this.handleExplorerFolderClick(event);
		});

		this.registerEvent(
			this.app.vault.on("create", () => {
				this.refreshFiles();
			}),
		);

		this.registerEvent(
			this.app.vault.on("delete", () => {
				this.refreshFiles();
			}),
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				void this.handlePathRename(file.path, oldPath);
				this.refreshFiles();
			}),
		);

		this.registerEvent(
			this.app.vault.on("modify", () => {
				this.refreshFiles();
			}),
		);
	}

	onunload() {
		this.explorerFolderStyleManager?.destroy();
		this.explorerToolbarManager?.destroy();
	}

	getFiles(): TFile[] {
		return this.files.filter((file) => !this.isExcluded(file.path));
	}

	async activateSearchView(mode: SearchSidebarMode = this.currentSidebarMode) {
		this.currentSidebarMode = mode;
		const existingLeaf = this.app.workspace.getLeavesOfType(FILE_NAME_SEARCH_VIEW_TYPE)[0];
		const leaf = existingLeaf ?? this.app.workspace.getLeftLeaf(false) ?? await this.app.workspace.ensureSideLeaf(
			FILE_NAME_SEARCH_VIEW_TYPE,
			"left",
			{
				active: true,
				reveal: true,
			},
		);

		await leaf.setViewState({
			type: FILE_NAME_SEARCH_VIEW_TYPE,
			active: true,
		});

		this.app.workspace.setActiveLeaf(leaf, { focus: true });
		await this.app.workspace.revealLeaf(leaf);

		const view = leaf.view;
		if (view instanceof FileNameSearchView) {
			view.setMode(mode);
			view.focusInput();
		}
	}

	async activateFolderSizesView() {
		this.calculateFolderSizes();
		await this.activateSearchView("folder-sizes");
	}

	async activatePinnedItemsView() {
		await this.activateSearchView("pinned");
	}

	async cleanupActiveMarkdown() {
		await cleanupActiveMarkdownFile(this);
	}

	async openFolderBrowser(folderPath: string) {
		const existingLeaf = this.app.workspace.getLeavesOfType(FOLDER_BROWSER_VIEW_TYPE)[0];
		const leaf = existingLeaf ?? this.app.workspace.getLeaf("tab");
		const currentState = leaf.getViewState().type === FOLDER_BROWSER_VIEW_TYPE
			? (leaf.getViewState().state ?? {})
			: {};

		await leaf.setViewState({
			type: FOLDER_BROWSER_VIEW_TYPE,
			active: true,
			state: {
				...currentState,
				folderPath,
			},
		});

		this.app.workspace.setActiveLeaf(leaf, { focus: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	getSidebarMode(): SearchSidebarMode {
		return this.currentSidebarMode;
	}

	getFolderSizeTree(): FolderSizeNode[] {
		return this.folderSizeTree;
	}

	getTotalVaultSizeBytes(): number {
		return this.totalVaultSizeBytes;
	}

	getFolderSizeCalculatedAt(): number | null {
		return this.folderSizeCalculatedAt;
	}

	calculateFolderSizes() {
		const result = buildFolderSizeTree(this.app.vault);
		this.folderSizeTree = result.rootNodes;
		this.totalVaultSizeBytes = result.totalSizeBytes;
		this.folderSizeCalculatedAt = Date.now();
		this.refreshOpenSearchViews();
	}

	private async initView() {
		const leaves = this.app.workspace.getLeavesOfType(FILE_NAME_SEARCH_VIEW_TYPE);
		if (leaves.length > 1) {
			for (const leaf of leaves.slice(1)) {
				leaf.detach();
			}
		}

		if (leaves.length > 0) {
			return;
		}

		const leaf = this.app.workspace.getLeftLeaf(false) ?? await this.app.workspace.ensureSideLeaf(
			FILE_NAME_SEARCH_VIEW_TYPE,
			"left",
			{
				active: false,
				reveal: false,
			},
		);

		await leaf.setViewState({
			type: FILE_NAME_SEARCH_VIEW_TYPE,
			active: false,
		});
	}

	async addExcludedFolder(folderPath: string) {
		if (this.settings.excludedFolders.includes(folderPath)) {
			return;
		}

		await this.updateSettings({
			excludedFolders: [...this.settings.excludedFolders, folderPath].sort((a, b) => a.localeCompare(b)),
		});
	}

	async removeExcludedFolder(folderPath: string) {
		await this.updateSettings({
			excludedFolders: this.settings.excludedFolders.filter((path) => path !== folderPath),
		});
	}

	async addFolderColorRule(folderPath: string) {
		if (this.settings.explorerStyleRules.some((rule) => rule.path === folderPath)) {
			return;
		}

		await this.upsertExplorerStyleRule(folderPath, { path: folderPath, itemType: "folder" });
	}

	async updateExplorerStyleRule(itemPath: string, partialRule: Partial<ExplorerItemStyleRule>) {
		await this.updateSettings({
			explorerStyleRules: this.settings.explorerStyleRules.map((rule) =>
				rule.path === itemPath
					? normalizeExplorerItemStyleRule({ ...rule, ...partialRule })
					: rule,
			),
		});
	}

	getExplorerStyleRule(itemPath: string): ExplorerItemStyleRule | null {
		return this.settings.explorerStyleRules.find((rule) => rule.path === itemPath) ?? null;
	}

	getColorHistoryBucket(category: ColorHistoryCategory): ColorHistoryBucket {
		return this.settings.colorHistory[category];
	}

	async rememberColor(category: ColorHistoryCategory, color: string) {
		const trimmedColor = color.trim();
		if (!trimmedColor) {
			return;
		}

		const bucket = this.getColorHistoryBucket(category);
		const nextRecent = [trimmedColor, ...bucket.recent.filter((value) => value !== trimmedColor && !bucket.pinned.includes(value))]
			.slice(0, 5);
		await this.updateSettings({
			colorHistory: {
				...this.settings.colorHistory,
				[category]: {
					...bucket,
					recent: nextRecent,
				},
			},
		});
	}

	async togglePinnedColor(category: ColorHistoryCategory, color: string) {
		const trimmedColor = color.trim();
		if (!trimmedColor) {
			return;
		}

		const bucket = this.getColorHistoryBucket(category);
		const isPinned = bucket.pinned.includes(trimmedColor);
		const nextPinned = isPinned
			? bucket.pinned.filter((value) => value !== trimmedColor)
			: [trimmedColor, ...bucket.pinned.filter((value) => value !== trimmedColor)].slice(0, 5);
		const nextRecent = bucket.recent.filter((value) => value !== trimmedColor);
		await this.updateSettings({
			colorHistory: {
				...this.settings.colorHistory,
				[category]: {
					recent: nextRecent,
					pinned: nextPinned,
				},
			},
		});
	}

	getFolderViewState(folderPath: string): FolderViewState {
		return normalizeFolderViewState(this.settings.folderViewStates[folderPath]);
	}

	async updateFolderViewState(folderPath: string, partialState: Partial<FolderViewState>) {
		const nextState = normalizeFolderViewState({
			...this.settings.folderViewStates[folderPath],
			...partialState,
		});

		await this.updateSettings({
			folderViewStates: {
				...this.settings.folderViewStates,
				[folderPath]: nextState,
			},
		});
	}

	async setFolderSortMode(folderPath: string, sortMode: FolderBrowserSortMode) {
		await this.updateFolderViewState(folderPath, { sortMode });
	}

	async togglePinnedInFolder(folderPath: string, itemPath: string) {
		const state = this.getFolderViewState(folderPath);
		const pinnedPaths = state.pinnedPaths.includes(itemPath)
			? state.pinnedPaths.filter((path) => path !== itemPath)
			: [...state.pinnedPaths, itemPath];

		await this.updateFolderViewState(folderPath, { pinnedPaths });
	}

	isPinnedInFolder(folderPath: string, itemPath: string): boolean {
		return this.getFolderViewState(folderPath).pinnedPaths.includes(itemPath);
	}

	async removePinnedEverywhere(itemPath: string) {
		const nextFolderViewStates: typeof this.settings.folderViewStates = {};
		let changed = false;

		for (const [folderPath, state] of Object.entries(this.settings.folderViewStates)) {
			const nextPinnedPaths = state.pinnedPaths.filter((path) => path !== itemPath);
			if (nextPinnedPaths.length !== state.pinnedPaths.length) {
				changed = true;
			}

			nextFolderViewStates[folderPath] = {
				...state,
				pinnedPaths: nextPinnedPaths,
			};
		}

		if (!changed) {
			return;
		}

		await this.updateSettings({
			folderViewStates: nextFolderViewStates,
		});
	}

	getPinnedFiles(): TFile[] {
		const uniquePaths = new Set<string>();
		for (const state of Object.values(this.settings.folderViewStates)) {
			for (const itemPath of state.pinnedPaths) {
				uniquePaths.add(itemPath);
			}
		}

		return Array.from(uniquePaths)
			.map((path) => this.app.vault.getAbstractFileByPath(path))
			.filter((file): file is TFile => file instanceof TFile && !this.isExcluded(file.path))
			.sort((left, right) => left.basename.localeCompare(right.basename, undefined, { sensitivity: "base" }));
	}

	async upsertExplorerStyleRule(
		itemPath: string,
		rule: Partial<ExplorerItemStyleRule> & Pick<ExplorerItemStyleRule, "path">,
	) {
		const normalizedRule = normalizeExplorerItemStyleRule(rule);
		const existingRule = this.getExplorerStyleRule(itemPath);

		if (existingRule) {
			await this.updateExplorerStyleRule(itemPath, normalizedRule);
			return;
		}

		await this.updateSettings({
			explorerStyleRules: [...this.settings.explorerStyleRules, normalizedRule].sort((left, right) =>
				left.path.localeCompare(right.path),
			),
		});
	}

	async removeExplorerStyleRule(itemPath: string) {
		await this.updateSettings({
			explorerStyleRules: this.settings.explorerStyleRules.filter((rule) => rule.path !== itemPath),
		});
	}

	openItemAppearanceModal(itemPath: string) {
		const item = this.app.vault.getAbstractFileByPath(itemPath);
		if (!item) {
			return;
		}

		new ItemAppearanceModal(this, item).open();
	}

	async updateSettings(partialSettings: Partial<FilenameSearchSettings>) {
		this.settings = {
			...this.settings,
			...partialSettings,
			excludedFolders: [...(partialSettings.excludedFolders ?? this.settings.excludedFolders)],
			explorerStyleRules: [...(partialSettings.explorerStyleRules ?? this.settings.explorerStyleRules)],
			folderViewStates: { ...(partialSettings.folderViewStates ?? this.settings.folderViewStates) },
			colorHistory: { ...(partialSettings.colorHistory ?? this.settings.colorHistory) },
			cleanup: {
				...(partialSettings.cleanup ?? this.settings.cleanup),
			},
		};
		await this.saveSettings();
	}

	private refreshFiles() {
		this.files = this.app.vault.getFiles();
		if (this.currentSidebarMode === "folder-sizes") {
			this.calculateFolderSizes();
		}
		this.explorerFolderStyleManager?.refresh();
		this.refreshOpenSearchViews();
	}

	private isExcluded(filePath: string): boolean {
		return this.settings.excludedFolders.some(
			(folderPath) => filePath === folderPath || filePath.startsWith(`${folderPath}/`),
		);
	}

	private refreshOpenSearchViews() {
		for (const leaf of this.app.workspace.getLeavesOfType(FILE_NAME_SEARCH_VIEW_TYPE)) {
			const view = leaf.view;
			if (view instanceof FileNameSearchView) {
				view.refresh();
			}
		}
	}

	private async loadSettings() {
		const loadedData = await this.loadData() as Partial<FilenameSearchSettings> | null;
		this.settings = {
			...DEFAULT_SETTINGS,
			...loadedData,
			excludedFolders: [...(loadedData?.excludedFolders ?? DEFAULT_SETTINGS.excludedFolders)],
			explorerStyleRules: getNormalizedExplorerRules(loadedData),
			folderViewStates: normalizeFolderViewStates(loadedData?.folderViewStates),
			colorHistory: normalizeColorHistory(loadedData?.colorHistory),
			cleanup: normalizeCleanupSettings(loadedData?.cleanup),
			openFolderBrowserOnExplorerClick: loadedData?.openFolderBrowserOnExplorerClick ?? DEFAULT_SETTINGS.openFolderBrowserOnExplorerClick,
			useFrontmatterStickerIcons: loadedData?.useFrontmatterStickerIcons ?? DEFAULT_SETTINGS.useFrontmatterStickerIcons,
			showPath: loadedData?.showPath ?? true,
		};
	}

	private async saveSettings() {
		await this.saveData(this.settings);
		this.explorerFolderStyleManager.refresh();
		this.refreshOpenSearchViews();
		this.refreshFolderBrowserViews();
	}

	private refreshFolderBrowserViews() {
		for (const leaf of this.app.workspace.getLeavesOfType(FOLDER_BROWSER_VIEW_TYPE)) {
			const view = leaf.view;
			if (view instanceof FolderBrowserView) {
				void view.refresh();
			}
		}
	}

	private async handleExplorerFolderClick(event: MouseEvent) {
		if (!this.settings.openFolderBrowserOnExplorerClick) {
			return;
		}

		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
			return;
		}

		const target = event.target;
		if (!(target instanceof HTMLElement)) {
			return;
		}

		if (target.closest(".nav-folder-collapse-indicator")) {
			return;
		}

		const titleEl = target.closest(".nav-folder-title");
		if (!(titleEl instanceof HTMLElement)) {
			return;
		}

		const path = titleEl?.getAttribute("data-path");
		if (path === null) {
			return;
		}

		window.setTimeout(() => {
			void this.openFolderBrowser(path ?? "");
		}, 0);
	}

	private async handlePathRename(newPath: string, oldPath: string) {
		const nextExplorerStyleRules = this.settings.explorerStyleRules.map((rule) =>
			rule.path === oldPath || rule.path.startsWith(`${oldPath}/`)
				? {
					...rule,
					path: rule.path === oldPath ? newPath : `${newPath}${rule.path.slice(oldPath.length)}`,
				}
				: rule,
		);

		const nextFolderViewStates: Record<string, FolderViewState> = {};
		for (const [path, state] of Object.entries(this.settings.folderViewStates)) {
			const nextPath = path === oldPath || path.startsWith(`${oldPath}/`)
				? (path === oldPath ? newPath : `${newPath}${path.slice(oldPath.length)}`)
				: path;
			nextFolderViewStates[nextPath] = {
				...state,
				pinnedPaths: state.pinnedPaths.map((pinnedPath) =>
					pinnedPath === oldPath || pinnedPath.startsWith(`${oldPath}/`)
						? (pinnedPath === oldPath ? newPath : `${newPath}${pinnedPath.slice(oldPath.length)}`)
						: pinnedPath,
				),
			};
		}

		this.settings = {
			...this.settings,
			explorerStyleRules: nextExplorerStyleRules,
			folderViewStates: nextFolderViewStates,
		};
		await this.saveSettings();
	}

	private registerIcons() {
		addIcon(
			FILE_NAME_SEARCH_ICON,
			[
				'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ',
				'stroke-linecap="round" stroke-linejoin="round">',
				'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>',
				'<path d="M14 3v5h5"/>',
				'<circle cx="10.5" cy="13.5" r="2.5"/>',
				'<path d="m12.5 15.5 2 2"/>',
				"</svg>",
			].join(""),
		);
	}
}

function getNormalizedExplorerRules(loadedData: Partial<FilenameSearchSettings> | null): ExplorerItemStyleRule[] {
	const currentRules = (loadedData?.explorerStyleRules ?? []).map((rule) =>
		normalizeExplorerItemStyleRule(rule),
	);

	if (currentRules.length > 0) {
		return currentRules;
	}

	const legacyRules = ((loadedData as { folderColorRules?: Array<Record<string, unknown>> } | null)?.folderColorRules ?? [])
		.map((rule) => normalizeExplorerItemStyleRule({
			path: typeof rule.folderPath === "string" ? rule.folderPath : "",
			itemType: "folder",
			textColor: typeof rule.textColor === "string" ? rule.textColor : null,
			backgroundColor: typeof rule.backgroundColor === "string" ? rule.backgroundColor : null,
			iconName: typeof rule.iconName === "string" ? rule.iconName : null,
			iconColor: typeof rule.iconColor === "string" ? rule.iconColor : null,
			iconBackgroundColor: typeof rule.iconBackgroundColor === "string" ? rule.iconBackgroundColor : null,
			includeSubfolders: Boolean(rule.includeSubfolders),
		}))
		.filter((rule) => rule.path.length > 0);

	return legacyRules;
}

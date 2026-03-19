import { addIcon, Plugin, TFile } from "obsidian";
import { getStrings } from "./i18n";
import { DEFAULT_SETTINGS, FilenameSearchSettings, FilenameSearchSettingTab } from "./settings";
import { FILE_NAME_SEARCH_VIEW_TYPE, FileNameSearchView } from "./ui/file-name-search-view";

const OPEN_SEARCH_COMMAND_ID = "open-file-name-search";
export const FILE_NAME_SEARCH_ICON = "ofs-file-search";

export default class ObsidianFilenameSearchPlugin extends Plugin {
	private files: TFile[] = [];
	settings: FilenameSearchSettings = DEFAULT_SETTINGS;
	readonly strings = getStrings();

	async onload() {
		this.registerIcons();
		await this.loadSettings();
		this.refreshFiles();

		this.registerView(
			FILE_NAME_SEARCH_VIEW_TYPE,
			(leaf) => new FileNameSearchView(leaf, this),
		);

		this.addCommand({
			id: OPEN_SEARCH_COMMAND_ID,
			name: this.strings.commandOpenSearch,
			callback: () => {
				void this.activateSearchView();
			},
		});

		this.addSettingTab(new FilenameSearchSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			void this.initView();
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
			this.app.vault.on("rename", () => {
				this.refreshFiles();
			}),
		);

		this.registerEvent(
			this.app.vault.on("modify", () => {
				this.refreshFiles();
			}),
		);
	}

	getFiles(): TFile[] {
		return this.files.filter((file) => !this.isExcluded(file.path));
	}

	async activateSearchView() {
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
			view.focusInput();
		}
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

	async updateSettings(partialSettings: Partial<FilenameSearchSettings>) {
		this.settings = {
			...this.settings,
			...partialSettings,
			excludedFolders: [...(partialSettings.excludedFolders ?? this.settings.excludedFolders)],
		};
		await this.saveSettings();
	}

	private refreshFiles() {
		this.files = this.app.vault.getFiles();
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
			showPath: loadedData?.showPath ?? true,
		};
	}

	private async saveSettings() {
		await this.saveData(this.settings);
		this.refreshOpenSearchViews();
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

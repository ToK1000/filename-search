import { App, FuzzySuggestModal, PluginSettingTab, Setting, TFolder } from "obsidian";
import { getStrings } from "./i18n";
import ObsidianFilenameSearchPlugin from "./main";

export interface FilenameSearchSettings {
	excludedFolders: string[];
	showPath: boolean;
	showModifiedDate: boolean;
}

export const DEFAULT_SETTINGS: FilenameSearchSettings = {
	excludedFolders: [],
	showPath: true,
	showModifiedDate: true,
};

export class FilenameSearchSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: ObsidianFilenameSearchPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		const strings = this.plugin.strings;

		containerEl.empty();

		new Setting(containerEl).setName(strings.settingsHeading).setHeading();

		new Setting(containerEl)
			.setName(strings.settingsShowPath)
			.setDesc(strings.settingsShowPathDesc)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showPath).onChange(async (value) => {
					await this.plugin.updateSettings({ showPath: value });
				});
			});

		new Setting(containerEl)
			.setName(strings.settingsShowModifiedDate)
			.setDesc(strings.settingsShowModifiedDateDesc)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showModifiedDate).onChange(async (value) => {
					await this.plugin.updateSettings({ showModifiedDate: value });
				});
			});

		new Setting(containerEl)
			.setName(strings.settingsExcludedFolders)
			.setDesc(strings.settingsExcludedFoldersDesc)
			.addButton((button) => {
				button
					.setButtonText(strings.settingsAddFolder)
					.setCta()
					.onClick(() => {
						new FolderSuggestModal(this.app, async (folderPath) => {
							await this.plugin.addExcludedFolder(folderPath);
							this.display();
						}).open();
					});
			});

		if (this.plugin.settings.excludedFolders.length === 0) {
			containerEl.createDiv({
				text: strings.settingsNoFolders,
				cls: "ofs-settings-empty",
			});
			return;
		}

		const listEl = containerEl.createDiv({ cls: "ofs-settings-list" });

		for (const folderPath of this.plugin.settings.excludedFolders) {
			new Setting(listEl)
				.setName(folderPath)
				.setDesc(strings.settingsExcludedFolderDesc)
				.addExtraButton((button) => {
					button
						.setIcon("trash")
						.setTooltip(strings.settingsRemoveFolder)
						.onClick(async () => {
							await this.plugin.removeExcludedFolder(folderPath);
							this.display();
						});
				});
		}
	}
}

class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
	private readonly folders: TFolder[];

	constructor(
		app: App,
		private readonly onChoose: (folderPath: string) => void | Promise<void>,
	) {
		super(app);
		const strings = getStrings();
		this.folders = app.vault
			.getAllLoadedFiles()
			.filter((file): file is TFolder => file instanceof TFolder)
			.filter((folder) => folder.path !== "/");
		this.setPlaceholder(strings.settingsChooseFolder);
	}

	getItems(): TFolder[] {
		return this.folders;
	}

	getItemText(folder: TFolder): string {
		return folder.path;
	}

	onChooseItem(folder: TFolder): void {
		void this.onChoose(folder.path);
	}
}

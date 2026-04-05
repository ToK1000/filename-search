import { App, Modal, PluginSettingTab, Setting } from "obsidian";
import { getStrings } from "./i18n";
import ObsidianFilenameSearchPlugin from "./main";

export type ExplorerItemType = "folder" | "file";
export type FolderBrowserSortMode = "alphabetical" | "modified" | "pinned";

export interface ExplorerItemStyleRule {
	path: string;
	itemType: ExplorerItemType;
	textColor: string | null;
	backgroundColor: string | null;
	iconName: string | null;
	iconColor: string | null;
	iconBackgroundColor: string | null;
	includeSubfolders: boolean;
}

export interface FolderViewState {
	sortMode: FolderBrowserSortMode;
	pinnedPaths: string[];
}

export type ColorHistoryCategory = "text" | "background" | "icon" | "iconBackground";

export interface ColorHistoryBucket {
	recent: string[];
	pinned: string[];
}

export interface ColorHistorySettings {
	text: ColorHistoryBucket;
	background: ColorHistoryBucket;
	icon: ColorHistoryBucket;
	iconBackground: ColorHistoryBucket;
}

export interface FilenameSearchSettings {
	excludedFolders: string[];
	explorerStyleRules: ExplorerItemStyleRule[];
	folderViewStates: Record<string, FolderViewState>;
	colorHistory: ColorHistorySettings;
	openFolderBrowserOnExplorerClick: boolean;
	useFrontmatterStickerIcons: boolean;
	showPath: boolean;
	showModifiedDate: boolean;
}

export const DEFAULT_SETTINGS: FilenameSearchSettings = {
	excludedFolders: [],
	explorerStyleRules: [],
	folderViewStates: {},
	colorHistory: createDefaultColorHistory(),
	openFolderBrowserOnExplorerClick: true,
	useFrontmatterStickerIcons: true,
	showPath: true,
	showModifiedDate: true,
};

export function normalizeExplorerItemStyleRule(
	rule: Partial<ExplorerItemStyleRule> & Pick<ExplorerItemStyleRule, "path">,
): ExplorerItemStyleRule {
	return {
		path: rule.path,
		itemType: rule.itemType ?? "folder",
		textColor: rule.textColor ?? null,
		backgroundColor: rule.backgroundColor ?? null,
		iconName: rule.iconName?.trim() ? rule.iconName.trim() : null,
		iconColor: rule.iconColor ?? null,
		iconBackgroundColor: rule.iconBackgroundColor ?? null,
		includeSubfolders: rule.includeSubfolders ?? false,
	};
}

export function normalizeFolderViewState(state: Partial<FolderViewState> | undefined): FolderViewState {
	return {
		sortMode: state?.sortMode ?? "alphabetical",
		pinnedPaths: [...(state?.pinnedPaths ?? [])],
	};
}

export function normalizeFolderViewStates(
	states: Record<string, Partial<FolderViewState>> | undefined,
): Record<string, FolderViewState> {
	const normalized: Record<string, FolderViewState> = {};
	for (const [path, state] of Object.entries(states ?? {})) {
		normalized[path] = normalizeFolderViewState(state);
	}

	return normalized;
}

export function createDefaultColorHistory(): ColorHistorySettings {
	return {
		text: { recent: [], pinned: [] },
		background: { recent: [], pinned: [] },
		icon: { recent: [], pinned: [] },
		iconBackground: { recent: [], pinned: [] },
	};
}

export function normalizeColorHistory(
	history: Partial<Record<ColorHistoryCategory, Partial<ColorHistoryBucket>>> | undefined,
): ColorHistorySettings {
	const defaults = createDefaultColorHistory();
	return {
		text: normalizeColorBucket(history?.text, defaults.text),
		background: normalizeColorBucket(history?.background, defaults.background),
		icon: normalizeColorBucket(history?.icon, defaults.icon),
		iconBackground: normalizeColorBucket(history?.iconBackground, defaults.iconBackground),
	};
}

function normalizeColorBucket(
	bucket: Partial<ColorHistoryBucket> | undefined,
	fallback: ColorHistoryBucket,
): ColorHistoryBucket {
	return {
		recent: normalizeColorList(bucket?.recent ?? fallback.recent),
		pinned: normalizeColorList(bucket?.pinned ?? fallback.pinned),
	};
}

function normalizeColorList(values: string[]): string[] {
	const normalized: string[] = [];
	for (const value of values) {
		const trimmed = value.trim();
		if (!trimmed || normalized.includes(trimmed)) {
			continue;
		}
		normalized.push(trimmed);
		if (normalized.length >= 5) {
			break;
		}
	}

	return normalized;
}

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

		new Setting(containerEl).setName(strings.settingsSearchHeading).setHeading();

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
			.setName(strings.settingsOpenFolderBrowserOnExplorerClick)
			.setDesc(strings.settingsOpenFolderBrowserOnExplorerClickDesc)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openFolderBrowserOnExplorerClick).onChange(async (value) => {
					await this.plugin.updateSettings({ openFolderBrowserOnExplorerClick: value });
				});
			});

		new Setting(containerEl)
			.setName(strings.settingsUseFrontmatterStickerIcons)
			.setDesc(strings.settingsUseFrontmatterStickerIconsDesc)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.useFrontmatterStickerIcons).onChange(async (value) => {
					await this.plugin.updateSettings({ useFrontmatterStickerIcons: value });
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
						new FolderPathModal(this.app, strings.settingsChooseFolder, async (folderPath) => {
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
		} else {
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

		new Setting(containerEl).setName(strings.settingsFolderColorsHeading).setHeading();

		new Setting(containerEl)
			.setName(strings.settingsFolderColors)
			.setDesc(strings.settingsFolderColorsDesc);

		if (this.plugin.settings.explorerStyleRules.length === 0) {
			containerEl.createDiv({
				text: strings.settingsNoFolderColorRulesHint,
				cls: "ofs-settings-empty",
			});
			return;
		}

		const folderRuleListEl = containerEl.createDiv({ cls: "ofs-settings-list" });

		for (const rule of this.plugin.settings.explorerStyleRules) {
			const ruleEl = folderRuleListEl.createDiv({ cls: "ofs-settings-rule" });

			new Setting(ruleEl)
				.setName(rule.path)
				.setDesc(describeRule(this.plugin, rule))
				.addButton((button) => {
					button
						.setButtonText(strings.settingsEditFolderColorRule)
						.setCta()
						.onClick(() => {
							this.plugin.openItemAppearanceModal(rule.path);
						});
				})
				.addExtraButton((button) => {
					button
						.setIcon("trash")
						.setTooltip(strings.settingsRemoveFolderColorRule)
						.onClick(async () => {
							await this.plugin.removeExplorerStyleRule(rule.path);
							this.display();
						});
				});
		}
	}
}

function describeRule(plugin: ObsidianFilenameSearchPlugin, rule: ExplorerItemStyleRule): string {
	const parts: string[] = [];

	parts.push(rule.itemType === "folder" ? plugin.strings.itemTypeFolder : plugin.strings.itemTypeFile);

	if (rule.textColor) {
		parts.push(plugin.strings.ruleSummaryTextColor(rule.textColor));
	}

	if (rule.backgroundColor) {
		parts.push(plugin.strings.ruleSummaryBackgroundColor(rule.backgroundColor));
	}

	if (rule.iconName) {
		parts.push(plugin.strings.ruleSummaryIcon(rule.iconName));
	}

	if (rule.iconColor) {
		parts.push(plugin.strings.ruleSummaryIconColor(rule.iconColor));
	}

	if (rule.includeSubfolders) {
		parts.push(plugin.strings.ruleSummaryIncludesSubfolders);
	}

	return parts.join(" • ") || plugin.strings.settingsFolderColorRuleDesc;
}

class FolderPathModal extends Modal {
	private folderPath = "";

	constructor(
		app: App,
		private readonly title: string,
		private readonly onSubmit: (folderPath: string) => void | Promise<void>,
	) {
		super(app);
	}

	onOpen(): void {
		const strings = getStrings();
		this.setTitle(this.title);

		new Setting(this.contentEl)
			.setName(strings.settingsFolderPath)
			.setDesc(strings.settingsFolderPathDesc)
			.addText((text) => {
				text
					.setPlaceholder("Projects/inbox")
					.setValue(this.folderPath)
					.onChange((value) => {
						this.folderPath = value.trim();
					});
				text.inputEl.focus();
			});

		new Setting(this.contentEl)
			.addButton((button) => {
				button
					.setButtonText(strings.folderAppearanceSave)
					.setCta()
					.onClick(() => {
						if (!this.folderPath) {
							return;
						}

						void this.onSubmit(this.folderPath);
						this.close();
					});
			})
			.addButton((button) => {
				button
					.setButtonText(strings.folderAppearanceCancel)
					.onClick(() => {
						this.close();
					});
			});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

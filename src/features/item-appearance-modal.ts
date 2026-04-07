import { Modal, setTooltip, TAbstractFile, TFolder } from "obsidian";
import { getFilteredIcons, getInitialIconSearchValue, ICON_CATEGORY_OPTIONS } from "./icon-picker";
import { getEffectiveStyle } from "./item-icon-source";
import { getStoredIconLabel, renderStoredIcon } from "./icon-renderer";
import ObsidianFilenameSearchPlugin from "../main";
import {
	ColorHistoryCategory,
	ExplorerItemStyleRule,
	normalizeExplorerItemStyleRule,
} from "../settings";

const DEFAULT_TEXT_COLOR = "#7c3aed";
const DEFAULT_BACKGROUND_COLOR = "#ede9fe";
const DEFAULT_ICON_COLOR = "#7c3aed";
const DEFAULT_ICON_BACKGROUND_COLOR = "#ede9fe";
const ICONS_PER_PAGE = 36;

type ColorFieldConfig = {
	category: ColorHistoryCategory;
	label: string;
	description: string;
	fallbackColor: string;
	getValue: () => string | null;
	setValue: (value: string | null) => void;
};

export class ItemAppearanceModal extends Modal {
	private draft: ExplorerItemStyleRule;
	private previewIconEl!: HTMLSpanElement;
	private previewLabelEl!: HTMLSpanElement;
	private previewRowEl!: HTMLDivElement;
	private iconResultsEl!: HTMLDivElement;
	private selectedIconValueEl!: HTMLDivElement;
	private iconSearchInputEl!: HTMLInputElement;
	private iconPagerEl!: HTMLDivElement;
	private clearIconButtonEl!: HTMLButtonElement;
	private iconSearch = "";
	private iconCategory = "all";
	private iconPage = 0;

	constructor(
		private readonly plugin: ObsidianFilenameSearchPlugin,
		private readonly item: TAbstractFile,
	) {
		super(plugin.app);
		const existingRule = plugin.getExplorerStyleRule(item.path);
		this.draft = normalizeExplorerItemStyleRule(existingRule ?? {
			path: item.path,
			itemType: item instanceof TFolder ? "folder" : "file",
		});
		this.draft.itemType = item instanceof TFolder ? "folder" : "file";
		this.applyInitialColorDefaults();
		this.iconSearch = getInitialIconSearchValue(this.draft.iconName);
	}

	onOpen(): void {
		const { contentEl } = this;
		const strings = this.plugin.strings;

		contentEl.empty();
		contentEl.addClass("ofs-item-appearance-modal");
		this.modalEl.addClass("ofs-item-appearance-modal-shell");
		this.setTitle(strings.itemAppearanceModalTitle(this.item.path));

		this.previewRowEl = contentEl.createDiv({ cls: "ofs-item-preview" });
		this.previewIconEl = this.previewRowEl.createSpan({ cls: "ofs-item-preview-icon" });
		this.previewLabelEl = this.previewRowEl.createSpan({
			cls: "ofs-item-preview-label",
			text: this.item.name,
		});
		void this.renderPreview();

		const layoutEl = contentEl.createDiv({ cls: "ofs-item-appearance-layout" });
		const iconSectionEl = layoutEl.createDiv({ cls: "ofs-item-appearance-section" });
		const colorsSectionEl = layoutEl.createDiv({ cls: "ofs-item-appearance-section" });

		this.buildIconSection(iconSectionEl);
		this.buildColorsSection(colorsSectionEl);

		if (this.item instanceof TFolder) {
			const behaviorSectionEl = contentEl.createDiv({ cls: "ofs-item-appearance-section" });
			behaviorSectionEl.createEl("h3", {
				text: strings.itemAppearanceBehaviorHeading,
				cls: "ofs-item-appearance-section-title",
			});
			const toggleRow = behaviorSectionEl.createDiv({ cls: "ofs-item-appearance-toggle-row" });
			const toggleWrap = toggleRow.createEl("label", { cls: "ofs-item-appearance-toggle" });
			const toggleEl = toggleWrap.createEl("input", { type: "checkbox" });
			toggleEl.checked = this.draft.includeSubfolders;
			toggleWrap.createSpan({ text: strings.settingsIncludeSubfolders });
			toggleEl.addEventListener("change", () => {
				this.draft.includeSubfolders = toggleEl.checked;
			});
			toggleRow.createDiv({
				text: strings.settingsIncludeSubfoldersDesc,
				cls: "ofs-item-appearance-help",
			});
		}

		const buttonRow = contentEl.createDiv({ cls: "ofs-item-modal-buttons" });
		const removeButton = buttonRow.createEl("button", {
			text: strings.folderAppearanceRemove,
			cls: "mod-warning",
			attr: { type: "button" },
		});
		removeButton.disabled = !this.plugin.getExplorerStyleRule(this.item.path);
		removeButton.addEventListener("click", () => {
			void this.remove();
		});

		const spacerEl = buttonRow.createDiv({ cls: "ofs-item-modal-spacer" });
		spacerEl.setAttr("aria-hidden", "true");

		const cancelButton = buttonRow.createEl("button", {
			text: strings.folderAppearanceCancel,
			attr: { type: "button" },
		});
		cancelButton.addEventListener("click", () => this.close());

		const saveButton = buttonRow.createEl("button", {
			text: strings.folderAppearanceSave,
			cls: "mod-cta",
			attr: { type: "button" },
		});
		saveButton.addEventListener("click", () => {
			void this.save();
		});
	}

	onClose(): void {
		this.contentEl.empty();
		this.modalEl.removeClass("ofs-item-appearance-modal-shell");
	}

	private buildIconSection(parentEl: HTMLElement) {
		const strings = this.plugin.strings;
		parentEl.createEl("h3", {
			text: strings.itemAppearanceIconHeading,
			cls: "ofs-item-appearance-section-title",
		});

		const controlsEl = parentEl.createDiv({ cls: "ofs-item-appearance-controls" });

		const categoryWrap = controlsEl.createDiv({ cls: "ofs-item-appearance-field" });
		categoryWrap.createEl("label", {
			text: strings.itemAppearanceIconCategory,
			cls: "ofs-item-appearance-label",
		});
		categoryWrap.createDiv({
			text: strings.itemAppearanceIconCategoryDesc,
			cls: "ofs-item-appearance-help",
		});
		const categorySelect = categoryWrap.createEl("select", { cls: "dropdown" });
		for (const option of ICON_CATEGORY_OPTIONS) {
			categorySelect.add(new Option(this.plugin.strings.iconCategoryLabel(option.value, option.label), option.value));
		}
		categorySelect.value = this.iconCategory;
		categorySelect.addEventListener("change", () => {
			this.iconCategory = categorySelect.value;
			this.iconPage = 0;
			void this.renderIconResults();
		});

		const searchWrap = controlsEl.createDiv({ cls: "ofs-item-appearance-field" });
		searchWrap.createEl("label", {
			text: strings.itemAppearanceIconSearch,
			cls: "ofs-item-appearance-label",
		});
		searchWrap.createDiv({
			text: strings.itemAppearanceIconSearchDesc,
			cls: "ofs-item-appearance-help",
		});
		this.iconSearchInputEl = searchWrap.createEl("input", {
			type: "text",
			placeholder: "folder, note, pin, archive...",
			cls: "ofs-item-appearance-search",
		});
		this.iconSearchInputEl.value = this.iconSearch;
		this.iconSearchInputEl.addEventListener("input", () => {
			this.iconSearch = this.iconSearchInputEl.value;
			this.iconPage = 0;
			void this.renderIconResults();
		});

		const selectedWrap = parentEl.createDiv({ cls: "ofs-item-appearance-selected" });
		selectedWrap.createDiv({
			text: strings.itemAppearanceSelectedIcon,
			cls: "ofs-item-appearance-label",
		});
		this.selectedIconValueEl = selectedWrap.createDiv({
			text: getStoredIconLabel(this.draft.iconName) ?? strings.itemAppearanceNoIconSelected,
			cls: "ofs-item-appearance-selected-value",
		});
		this.clearIconButtonEl = selectedWrap.createEl("button", {
			text: strings.itemAppearanceClearIcon,
			attr: { type: "button" },
		});
		this.clearIconButtonEl.disabled = !this.draft.iconName;
		this.clearIconButtonEl.addEventListener("click", () => {
			this.draft.iconName = null;
			this.updateSelectedIconSummary();
			void this.renderPreview();
			void this.renderIconResults();
		});

		this.iconPagerEl = parentEl.createDiv({ cls: "ofs-icon-pager" });
		this.iconResultsEl = parentEl.createDiv({ cls: "ofs-icon-results" });
		void this.renderIconResults();
	}

	private buildColorsSection(parentEl: HTMLElement) {
		const strings = this.plugin.strings;
		parentEl.createEl("h3", {
			text: strings.itemAppearanceColorsHeading,
			cls: "ofs-item-appearance-section-title",
		});

		const gridEl = parentEl.createDiv({ cls: "ofs-item-appearance-color-grid" });
		const colorFields: ColorFieldConfig[] = [
			{
				category: "icon",
				label: strings.folderAppearanceIconColor,
				description: strings.folderAppearanceIconColorDesc,
				fallbackColor: DEFAULT_ICON_COLOR,
				getValue: () => this.draft.iconColor,
				setValue: (value) => {
					this.draft.iconColor = value;
				},
			},
			{
				category: "iconBackground",
				label: strings.itemAppearanceIconBackgroundColor,
				description: strings.itemAppearanceIconBackgroundColorDesc,
				fallbackColor: DEFAULT_ICON_BACKGROUND_COLOR,
				getValue: () => this.draft.iconBackgroundColor,
				setValue: (value) => {
					this.draft.iconBackgroundColor = value;
				},
			},
			{
				category: "text",
				label: strings.settingsFolderTextColor,
				description: strings.settingsFolderTextColorDesc,
				fallbackColor: DEFAULT_TEXT_COLOR,
				getValue: () => this.draft.textColor,
				setValue: (value) => {
					this.draft.textColor = value;
				},
			},
			{
				category: "background",
				label: strings.settingsFolderBackgroundColor,
				description: strings.settingsFolderBackgroundColorDesc,
				fallbackColor: DEFAULT_BACKGROUND_COLOR,
				getValue: () => this.draft.backgroundColor,
				setValue: (value) => {
					this.draft.backgroundColor = value;
				},
			},
		];

		for (const config of colorFields) {
			this.buildColorField(gridEl, config);
		}
	}

	private buildColorField(parentEl: HTMLElement, config: ColorFieldConfig) {
		const fieldEl = parentEl.createDiv({ cls: "ofs-item-appearance-color-field" });
		fieldEl.createDiv({ text: config.label, cls: "ofs-item-appearance-label" });
		fieldEl.createDiv({ text: config.description, cls: "ofs-item-appearance-help" });

		const controlsEl = fieldEl.createDiv({ cls: "ofs-item-appearance-color-controls" });
		const currentValueSwatch = controlsEl.createDiv({ cls: "ofs-item-appearance-current-color" });
		const colorInput = controlsEl.createEl("input", {
			type: "color",
			cls: "ofs-item-appearance-color-input",
		});
		colorInput.value = config.getValue() ?? config.fallbackColor;
		this.updateColorControlState(colorInput, currentValueSwatch, config.getValue());
		const applySelectedColor = () => {
			const value = colorInput.value;
			config.setValue(value);
			void this.plugin.rememberColor(config.category, value);
			this.updateColorControlState(colorInput, currentValueSwatch, value);
			void this.renderPreview();
			this.renderColorHistory(fieldEl, config, colorInput);
		};
		colorInput.addEventListener("input", applySelectedColor);
		colorInput.addEventListener("change", applySelectedColor);

		const noneButton = controlsEl.createEl("button", {
			text: this.plugin.strings.colorNone,
			attr: { type: "button" },
		});
		noneButton.addEventListener("click", () => {
			config.setValue(null);
			this.updateColorControlState(colorInput, currentValueSwatch, null);
			void this.renderPreview();
			colorInput.value = config.fallbackColor;
			this.renderColorHistory(fieldEl, config, colorInput);
		});

		this.renderColorHistory(fieldEl, config, colorInput);
	}

	private applyInitialColorDefaults() {
		const effectiveStyle = getEffectiveStyle(this.plugin.settings.explorerStyleRules, this.item.path);
		this.draft.textColor = this.resolveInitialColor("text", this.draft.textColor, effectiveStyle?.textColor ?? null);
		this.draft.backgroundColor = this.resolveInitialColor("background", this.draft.backgroundColor, effectiveStyle?.backgroundColor ?? null);
		this.draft.iconColor = this.resolveInitialColor("icon", this.draft.iconColor, effectiveStyle?.iconColor ?? null);
		this.draft.iconBackgroundColor = this.resolveInitialColor(
			"iconBackground",
			this.draft.iconBackgroundColor,
			effectiveStyle?.iconBackgroundColor ?? null,
		);
	}

	private resolveInitialColor(
		_category: ColorHistoryCategory,
		currentValue: string | null,
		effectiveValue: string | null,
	): string | null {
		if (currentValue) {
			return currentValue;
		}

		if (effectiveValue) {
			return effectiveValue;
		}

		return null;
	}

	private updateColorControlState(
		colorInput: HTMLInputElement,
		currentValueSwatch: HTMLDivElement,
		value: string | null,
	) {
		const isUnset = value === null;
		colorInput.toggleClass("is-unset", isUnset);
		currentValueSwatch.toggleClass("is-unset", isUnset);
		currentValueSwatch.style.background = isUnset ? "" : value;
		currentValueSwatch.setAttribute(
			"aria-label",
			isUnset ? this.plugin.strings.colorNone : value,
		);
		currentValueSwatch.setAttribute(
			"title",
			isUnset ? this.plugin.strings.colorNone : value,
		);
	}

	private renderColorHistory(
		fieldEl: HTMLElement,
		config: ColorFieldConfig,
		colorInput: HTMLInputElement,
	) {
		fieldEl.querySelector(".ofs-item-appearance-history")?.remove();
		const historyEl = fieldEl.createDiv({ cls: "ofs-item-appearance-history" });
		const bucket = this.plugin.getColorHistoryBucket(config.category);

		this.renderColorRow(historyEl, this.plugin.strings.itemAppearancePinnedColors, bucket.pinned, true, config, colorInput);
		this.renderColorRow(historyEl, this.plugin.strings.itemAppearanceRecentColors, bucket.recent, false, config, colorInput);
	}

	private renderColorRow(
		parentEl: HTMLElement,
		label: string,
		colors: string[],
		pinned: boolean,
		config: ColorFieldConfig,
		colorInput: HTMLInputElement,
	) {
		if (colors.length === 0) {
			return;
		}

		const rowEl = parentEl.createDiv({ cls: "ofs-item-appearance-history-row" });
		rowEl.createSpan({ text: label, cls: "ofs-item-appearance-history-label" });
		const swatchesEl = rowEl.createDiv({ cls: "ofs-item-appearance-swatches" });

		for (const color of colors) {
			const swatchWrapEl = swatchesEl.createDiv({ cls: "ofs-item-appearance-swatch-wrap" });
			const swatchEl = swatchWrapEl.createEl("button", {
				cls: "ofs-item-appearance-swatch",
				attr: { type: "button", title: color, "aria-label": color },
			});
			swatchEl.style.background = color;
			swatchEl.addEventListener("click", () => {
				config.setValue(color);
				colorInput.value = color;
				void this.plugin.rememberColor(config.category, color);
				void this.renderPreview();
				this.renderColorHistory(parentEl.parentElement as HTMLElement, config, colorInput);
			});

			const pinButton = swatchWrapEl.createEl("button", {
				cls: `ofs-item-appearance-swatch-pin${pinned ? " is-active" : ""}`,
				attr: {
					type: "button",
					title: pinned ? this.plugin.strings.itemAppearanceUnpinColor : this.plugin.strings.itemAppearancePinColor,
					"aria-label": pinned ? this.plugin.strings.itemAppearanceUnpinColor : this.plugin.strings.itemAppearancePinColor,
				},
			});
			pinButton.setText("P");
			pinButton.addEventListener("click", () => {
				void this.plugin.togglePinnedColor(config.category, color).then(() => {
					this.renderColorHistory(parentEl.parentElement as HTMLElement, config, colorInput);
				});
			});
		}
	}

	private async renderPreview() {
		this.previewRowEl.style.color = this.draft.textColor ?? "";
		this.previewRowEl.style.background = this.draft.backgroundColor ?? "";
		this.previewRowEl.empty();

		this.previewIconEl = this.previewRowEl.createSpan({ cls: "ofs-item-preview-icon" });
		this.previewLabelEl = this.previewRowEl.createSpan({
			cls: "ofs-item-preview-label",
			text: this.item.name,
		});

		await renderStoredIcon(this.plugin, this.previewIconEl, this.draft.iconName, this.getFallbackIcon());
		if (this.draft.iconColor) {
			this.previewIconEl.style.color = this.draft.iconColor;
		}
		this.previewIconEl.style.background = this.draft.iconBackgroundColor ?? "";
	}

	private async renderIconResults() {
		this.iconResultsEl.empty();
		this.iconPagerEl.empty();

		const matchingIcons = getFilteredIcons(this.plugin, this.iconSearch, this.iconCategory);
		const totalPages = Math.max(1, Math.ceil(matchingIcons.length / ICONS_PER_PAGE));
		this.iconPage = Math.min(this.iconPage, totalPages - 1);
		const pageItems = matchingIcons.slice(this.iconPage * ICONS_PER_PAGE, (this.iconPage + 1) * ICONS_PER_PAGE);

		const prevButton = this.iconPagerEl.createEl("button", {
			text: this.plugin.strings.itemAppearancePreviousPage,
			attr: { type: "button" },
		});
		prevButton.disabled = this.iconPage === 0;
		prevButton.addEventListener("click", () => {
			this.iconPage -= 1;
			void this.renderIconResults();
		});

		this.iconPagerEl.createDiv({
			text: this.plugin.strings.itemAppearancePageInfo(this.iconPage + 1, totalPages),
			cls: "ofs-item-appearance-page-info",
		});

		const nextButton = this.iconPagerEl.createEl("button", {
			text: this.plugin.strings.itemAppearanceNextPage,
			attr: { type: "button" },
		});
		nextButton.disabled = this.iconPage >= totalPages - 1;
		nextButton.addEventListener("click", () => {
			this.iconPage += 1;
			void this.renderIconResults();
		});

		if (pageItems.length === 0) {
			this.iconResultsEl.createDiv({
				cls: "ofs-icon-results-empty",
				text: this.plugin.strings.itemAppearanceNoIconsFound,
			});
			return;
		}

		for (const iconOption of pageItems) {
			const buttonEl = this.iconResultsEl.createEl("button", {
				cls: `ofs-icon-choice${this.draft.iconName === iconOption.value ? " is-selected" : ""}`,
				attr: { type: "button", "aria-label": iconOption.label },
			});
			const iconEl = buttonEl.createSpan({ cls: "ofs-icon-choice-icon" });
			setTooltip(buttonEl, iconOption.label);
			await renderStoredIcon(this.plugin, iconEl, iconOption.value);
			buttonEl.addEventListener("click", () => {
				this.draft.iconName = iconOption.value;
				this.iconSearch = getStoredIconLabel(iconOption.value) ?? "";
				this.iconSearchInputEl.value = this.iconSearch;
				this.updateSelectedIconSummary();
				void this.renderPreview();
				void this.renderIconResults();
			});
		}
	}

	private getFallbackIcon(): string {
		return this.draft.itemType === "folder" ? "folder" : "file";
	}

	private async save() {
		if (this.draft.textColor) {
			await this.plugin.rememberColor("text", this.draft.textColor);
		}
		if (this.draft.backgroundColor) {
			await this.plugin.rememberColor("background", this.draft.backgroundColor);
		}
		if (this.draft.iconColor) {
			await this.plugin.rememberColor("icon", this.draft.iconColor);
		}
		if (this.draft.iconBackgroundColor) {
			await this.plugin.rememberColor("iconBackground", this.draft.iconBackgroundColor);
		}

		await this.plugin.upsertExplorerStyleRule(this.item.path, this.draft);
		this.close();
	}

	private async remove() {
		await this.plugin.removeExplorerStyleRule(this.item.path);
		this.close();
	}

	private updateSelectedIconSummary() {
		this.selectedIconValueEl.setText(
			getStoredIconLabel(this.draft.iconName) ?? this.plugin.strings.itemAppearanceNoIconSelected,
		);
		this.clearIconButtonEl.disabled = !this.draft.iconName;
	}
}

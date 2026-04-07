import { Component, Editor, MarkdownRenderer, Modal, setIcon } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";
import { buildCalloutBlock, CALLOUT_DEFINITIONS, CalloutDefinition, insertCalloutForSelection } from "./callout-tool";

export class CalloutPickerModal extends Modal {
	private availableCallouts = [...CALLOUT_DEFINITIONS];
	private selectedCallout = CALLOUT_DEFINITIONS[0] as CalloutDefinition;
	private titleValue = "";
	private searchValue = "";
	private previewEl!: HTMLDivElement;
	private listEl!: HTMLDivElement;
	private previewRenderToken = 0;
	private previewComponent = new Component();

	constructor(
		private readonly plugin: ObsidianFilenameSearchPlugin,
		private readonly editor?: Editor,
	) {
		super(plugin.app);
	}

	onOpen() {
		this.modalEl.addClass("ofs-callout-modal-shell");
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ofs-modal");

		contentEl.createEl("h2", {
			text: this.plugin.strings.calloutModalTitle,
		});

		const layoutEl = contentEl.createDiv({ cls: "ofs-callout-layout" });
		const controlsEl = layoutEl.createDiv({ cls: "ofs-callout-section" });
		const previewSectionEl = layoutEl.createDiv({ cls: "ofs-callout-section" });

		this.createTextField(
			controlsEl,
			this.plugin.strings.calloutSearchLabel,
			this.plugin.strings.calloutSearchDesc,
			this.plugin.strings.calloutSearchPlaceholder,
			(value) => {
				this.searchValue = value.trim().toLowerCase();
				this.renderCalloutList();
			},
		);

		this.createTextField(
			controlsEl,
			this.plugin.strings.calloutTitleLabel,
			this.plugin.strings.calloutTitleDesc,
			this.plugin.strings.calloutTitlePlaceholder,
			(value) => {
				this.titleValue = value;
				void this.renderPreview();
			},
		);

		this.listEl = controlsEl.createDiv({ cls: "ofs-callout-list" });
		this.createSectionHeading(
			previewSectionEl,
			this.plugin.strings.calloutPreviewLabel,
			this.plugin.strings.calloutPreviewDesc,
		);
		this.previewEl = previewSectionEl.createDiv({ cls: "ofs-callout-preview-host" });

		const buttonsEl = contentEl.createDiv({ cls: "ofs-item-modal-buttons" });
		const cancelButton = buttonsEl.createEl("button", {
			text: this.plugin.strings.folderAppearanceCancel,
			attr: { type: "button" },
		});
		cancelButton.addEventListener("click", () => this.close());

		const spacerEl = buttonsEl.createDiv({ cls: "ofs-item-modal-spacer" });
		spacerEl.setAttr("aria-hidden", "true");

		const insertButton = buttonsEl.createEl("button", {
			text: this.plugin.strings.calloutInsertButton,
			cls: "mod-cta",
			attr: { type: "button" },
		});
		insertButton.addEventListener("click", () => {
			const didInsert = insertCalloutForSelection(
				this.plugin,
				this.editor,
				this.selectedCallout.id,
				this.titleValue,
			);
			if (didInsert) {
				this.close();
			}
		});

		this.renderCalloutList();
		void this.renderPreview();
		void this.loadAdditionalCallouts();
	}

	onClose() {
		this.previewComponent.unload();
		this.previewComponent = new Component();
		this.contentEl.empty();
	}

	private createSectionHeading(parentEl: HTMLElement, label: string, description: string) {
		const fieldEl = parentEl.createDiv({ cls: "ofs-callout-field" });
		fieldEl.createDiv({
			cls: "ofs-callout-field-label",
			text: label,
		});
		fieldEl.createDiv({
			cls: "ofs-callout-field-help",
			text: description,
		});
	}

	private createTextField(
		parentEl: HTMLElement,
		label: string,
		description: string,
		placeholder: string,
		onChange: (value: string) => void,
	) {
		const fieldEl = parentEl.createDiv({ cls: "ofs-callout-field" });
		fieldEl.createDiv({
			cls: "ofs-callout-field-label",
			text: label,
		});
		fieldEl.createDiv({
			cls: "ofs-callout-field-help",
			text: description,
		});
		const inputEl = fieldEl.createEl("input", {
			type: "text",
			cls: "ofs-callout-input",
			attr: { placeholder },
		});
		inputEl.addEventListener("input", () => {
			onChange(inputEl.value);
		});
	}

	private renderCalloutList() {
		this.listEl.empty();
		const visibleCallouts = this.availableCallouts.filter((callout) => {
			if (!this.searchValue) {
				return true;
			}

			const haystack = `${callout.id} ${callout.label} ${callout.description}`.toLowerCase();
			return haystack.includes(this.searchValue);
		});

		if (!visibleCallouts.some((callout) => callout.id === this.selectedCallout.id) && visibleCallouts.length > 0) {
			this.selectedCallout = visibleCallouts[0] as CalloutDefinition;
			void this.renderPreview();
		}

		if (visibleCallouts.length === 0) {
			this.listEl.createDiv({
				cls: "ofs-icon-results-empty",
				text: this.plugin.strings.calloutNoMatches,
			});
			return;
		}

		for (const callout of visibleCallouts) {
			const optionEl = this.listEl.createDiv({
				cls: `ofs-callout-option${callout.id === this.selectedCallout.id ? " is-selected" : ""}`,
				attr: { "aria-label": callout.label, role: "button", tabindex: "0" },
			});
			const badgeEl = optionEl.createDiv({
				cls: "ofs-callout-option-badge",
				attr: { "data-callout": callout.id },
			});
			badgeEl.style.setProperty("--ofs-callout-accent", callout.accent ?? getFallbackCalloutAccent(callout.id));
			const badgeIconEl = badgeEl.createDiv({ cls: "ofs-callout-option-badge-icon" });
			setIcon(badgeIconEl, callout.icon ?? getFallbackCalloutIcon(callout.id));

			const textEl = optionEl.createDiv({ cls: "ofs-callout-option-text" });
			const titleRowEl = textEl.createDiv({ cls: "ofs-callout-option-title-row" });
			titleRowEl.createDiv({
				cls: "ofs-callout-option-title",
				text: callout.label,
			});
			titleRowEl.createDiv({
				cls: "ofs-callout-option-source",
				text: getCalloutSourceLabel(this.plugin, callout),
			});
			textEl.createDiv({
				cls: "ofs-callout-option-description",
				text: callout.description,
			});

			optionEl.addEventListener("click", () => {
				this.selectedCallout = callout;
				this.renderCalloutList();
				void this.renderPreview();
			});
			optionEl.addEventListener("keydown", (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					this.selectedCallout = callout;
					this.renderCalloutList();
					void this.renderPreview();
				}
			});
		}
	}

	private async renderPreview() {
		const renderToken = ++this.previewRenderToken;
		this.previewComponent.unload();
		this.previewComponent = new Component();
		this.previewEl.empty();
		const markdownPreviewEl = this.previewEl.createDiv({ cls: "ofs-callout-markdown-preview markdown-rendered" });
		const markdown = buildCalloutBlock(
			this.selectedCallout.id,
			this.plugin.strings.calloutPreviewBody,
			this.titleValue,
		);
		await MarkdownRenderer.render(this.plugin.app, markdown, markdownPreviewEl, "", this.previewComponent);
		if (renderToken !== this.previewRenderToken) {
			return;
		}
		const codePreviewEl = this.previewEl.createEl("pre", { cls: "ofs-callout-code-preview" });
		codePreviewEl.setText(markdown);
	}

	private async loadAdditionalCallouts() {
		const callouts = await loadCalloutManagerDefinitions(this.plugin);
		if (callouts.length === 0) {
			return;
		}

		const byId = new Map<string, CalloutDefinition>();
		for (const callout of this.availableCallouts) {
			byId.set(callout.id, callout);
		}
		for (const callout of callouts) {
			byId.set(callout.id, {
				...byId.get(callout.id),
				...callout,
			});
		}

		this.availableCallouts = [...byId.values()].sort((left, right) => left.label.localeCompare(right.label));
		const selectedId = this.selectedCallout.id;
		this.selectedCallout = this.availableCallouts.find((callout) => callout.id === selectedId) ?? this.availableCallouts[0] ?? this.selectedCallout;
		this.renderCalloutList();
		void this.renderPreview();
	}
}

function getFallbackCalloutIcon(calloutId: string): string {
	switch (calloutId) {
		case "tip":
		case "success":
			return "lightbulb";
		case "warning":
		case "danger":
		case "failure":
			return "alert-triangle";
		case "question":
			return "help-circle";
		case "bug":
			return "bug";
		case "quote":
			return "quote";
		case "todo":
			return "check-square";
		case "info":
		case "abstract":
			return "info";
		case "example":
			return "list";
		default:
			return "sticky-note";
	}
}

function getFallbackCalloutAccent(calloutId: string): string {
	switch (calloutId) {
		case "note":
			return "#6ea8ff";
		case "abstract":
			return "#58c4dd";
		case "info":
			return "#5aa9ff";
		case "todo":
			return "#6fb0ff";
		case "tip":
			return "#55d6c2";
		case "success":
			return "#8ccf6e";
		case "question":
			return "#e2a75f";
		case "warning":
			return "#ffb454";
		case "failure":
			return "#ff7a90";
		case "danger":
			return "#ff5c7a";
		case "bug":
			return "#ff6f61";
		case "example":
			return "#b08cff";
		case "quote":
			return "#a4a4b8";
		default:
			return "#7f8aa3";
	}
}

async function loadCalloutManagerDefinitions(
	plugin: ObsidianFilenameSearchPlugin,
): Promise<CalloutDefinition[]> {
	const adapter = plugin.app.vault.adapter;
	const dataPath = `${plugin.app.vault.configDir}/plugins/callout-manager/data.json`;
	if (!(await adapter.exists(dataPath))) {
		return [];
	}

	try {
		const rawData = await adapter.read(dataPath);
		const parsedData = JSON.parse(rawData) as CalloutManagerData;
		const customIds = new Set(parsedData.callouts?.custom ?? []);
		const configuredIds = Object.keys(parsedData.callouts?.settings ?? {});
		const allIds = [...new Set([...customIds, ...configuredIds])]
			.filter((value): value is string => typeof value === "string" && value.trim().length > 0);

		return allIds.map((id) => {
			const resolvedSettings = resolveCalloutManagerSettings(parsedData.callouts?.settings?.[id] ?? []);
			return {
				id,
				label: formatCalloutLabel(id),
				description: customIds.has(id)
					? plugin.strings.calloutCustomDescription
					: plugin.strings.calloutManagedDescription,
				icon: resolvedSettings.icon ?? undefined,
				accent: resolvedSettings.color ?? undefined,
				source: "callout-manager",
			};
		});
	} catch {
		return [];
	}
}

function resolveCalloutManagerSettings(
	settings: CalloutManagerEntry[],
): { icon: string | null; color: string | null } {
	const currentScheme = document.body.classList.contains("theme-light") ? "light" : "dark";
	let icon: string | null = null;
	let color: string | null = null;

	for (const entry of settings) {
		const colorScheme = entry.condition?.colorScheme;
		if (colorScheme && colorScheme !== currentScheme) {
			continue;
		}

		const nextIcon = normalizeCalloutManagerIcon(entry.changes?.icon);
		if (nextIcon) {
			icon = nextIcon;
		}

		const nextColor = normalizeCalloutManagerColor(entry.changes?.color);
		if (nextColor) {
			color = nextColor;
		}
	}

	return { icon, color };
}

function normalizeCalloutManagerIcon(icon: unknown): string | null {
	if (typeof icon !== "string" || !icon.trim()) {
		return null;
	}

	return icon.trim().replace(/^lucide-/, "");
}

function normalizeCalloutManagerColor(color: unknown): string | null {
	if (typeof color !== "string" || !color.trim()) {
		return null;
	}

	const parts = color.split(",").map((value) => Number.parseInt(value.trim(), 10));
	if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
		return null;
	}

	return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
}

function formatCalloutLabel(id: string): string {
	return id
		.split(/[-_]+/)
		.filter((part) => part.length > 0)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function getCalloutSourceLabel(
	plugin: ObsidianFilenameSearchPlugin,
	callout: CalloutDefinition,
): string {
	return callout.source === "callout-manager"
		? plugin.strings.calloutSourceManager
		: plugin.strings.calloutSourceBuiltIn;
}

type CalloutManagerData = {
	callouts?: {
		custom?: string[];
		settings?: Record<string, CalloutManagerEntry[]>;
	};
};

type CalloutManagerEntry = {
	condition?: {
		colorScheme?: "light" | "dark";
	};
	changes?: {
		icon?: string;
		color?: string;
	};
};

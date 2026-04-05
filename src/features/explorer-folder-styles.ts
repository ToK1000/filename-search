import { Component, View, WorkspaceLeaf } from "obsidian";
import { getEffectiveItemIconValue, getEffectiveStyle } from "./item-icon-source";
import { renderStoredIcon } from "./icon-renderer";
import ObsidianFilenameSearchPlugin from "../main";

const FILE_EXPLORER_VIEW_TYPE = "file-explorer";
const STYLED_TARGET_CLASS = "ofs-item-style-target";
const CUSTOM_ICON_CLASS = "ofs-item-custom-icon";
const TEXT_COLOR_VARIABLE = "--ofs-folder-text-color";
const BACKGROUND_COLOR_VARIABLE = "--ofs-folder-background-color";
const ICON_COLOR_VARIABLE = "--ofs-folder-icon-color";
const ICON_BACKGROUND_COLOR_VARIABLE = "--ofs-folder-icon-background-color";

export class ExplorerFolderStyleManager extends Component {
	constructor(private readonly plugin: ObsidianFilenameSearchPlugin) {
		super();
	}

	refresh() {
		const explorerLeaves = this.plugin.app.workspace.getLeavesOfType(FILE_EXPLORER_VIEW_TYPE);

		for (const leaf of explorerLeaves) {
			this.applyStylesToLeaf(leaf);
		}
	}

	destroy() {
		for (const leaf of this.plugin.app.workspace.getLeavesOfType(FILE_EXPLORER_VIEW_TYPE)) {
			this.clearStyles(leaf.view.containerEl);
		}

		this.unload();
	}

	private applyStylesToLeaf(leaf: WorkspaceLeaf) {
		const containerEl = this.getExplorerContainer(leaf.view);
		if (!containerEl) {
			return;
		}

		this.clearStyles(containerEl);

		for (const candidate of this.getExplorerCandidates(containerEl)) {
			if (!candidate.path) {
				continue;
			}

			const abstractFile = this.plugin.app.vault.getAbstractFileByPath(candidate.path);
			if (!abstractFile) {
				continue;
			}

			const effectiveStyle = getEffectiveStyle(this.plugin.settings.explorerStyleRules, abstractFile.path);
			const iconValue = getEffectiveItemIconValue(this.plugin, abstractFile, effectiveStyle);
			if (effectiveStyle) {
				candidate.element.addClass(STYLED_TARGET_CLASS);

				if (effectiveStyle.textColor) {
					candidate.element.style.setProperty(TEXT_COLOR_VARIABLE, effectiveStyle.textColor);
				}

				if (effectiveStyle.backgroundColor) {
					candidate.element.style.setProperty(BACKGROUND_COLOR_VARIABLE, effectiveStyle.backgroundColor);
				}

				if (effectiveStyle.iconColor) {
					candidate.element.style.setProperty(ICON_COLOR_VARIABLE, effectiveStyle.iconColor);
				}

				if (effectiveStyle.iconBackgroundColor) {
					candidate.element.style.setProperty(ICON_BACKGROUND_COLOR_VARIABLE, effectiveStyle.iconBackgroundColor);
				}
			}

			if (iconValue) {
				void this.applyIcon(candidate.element, candidate.contentSelector, iconValue);
			}
		}
	}

	private clearStyles(containerEl: HTMLElement) {
		for (const styledEl of Array.from(containerEl.querySelectorAll<HTMLElement>(`.${STYLED_TARGET_CLASS}`))) {
			styledEl.removeClass(STYLED_TARGET_CLASS);
			styledEl.style.removeProperty(TEXT_COLOR_VARIABLE);
			styledEl.style.removeProperty(BACKGROUND_COLOR_VARIABLE);
			styledEl.style.removeProperty(ICON_COLOR_VARIABLE);
			styledEl.style.removeProperty(ICON_BACKGROUND_COLOR_VARIABLE);
		}

		for (const iconEl of Array.from(containerEl.querySelectorAll<HTMLElement>(`.${CUSTOM_ICON_CLASS}`))) {
			iconEl.remove();
		}
	}

	private getExplorerContainer(view: View): HTMLElement | null {
		return view.containerEl.querySelector(".view-content") ?? view.containerEl;
	}

	private getExplorerCandidates(containerEl: HTMLElement): Array<{
		element: HTMLElement;
		path: string;
		contentSelector: string;
	}> {
		const folderCandidates = Array.from(containerEl.querySelectorAll<HTMLElement>(".nav-folder-title[data-path]"))
			.map((element) => ({
				element,
				path: element.dataset.path ?? "",
				contentSelector: ".nav-folder-title-content",
			}));
		const fileCandidates = Array.from(containerEl.querySelectorAll<HTMLElement>(".nav-file-title[data-path]"))
			.map((element) => ({
				element,
				path: element.dataset.path ?? "",
				contentSelector: ".nav-file-title-content",
			}));

		return [...folderCandidates, ...fileCandidates];
	}

	private async applyIcon(candidateEl: HTMLElement, contentSelector: string, iconName: string) {
		const contentEl = candidateEl.querySelector<HTMLElement>(contentSelector);
		if (!contentEl || contentEl.querySelector(`.${CUSTOM_ICON_CLASS}`)) {
			return;
		}

		const iconEl = document.createElement("span");
		iconEl.className = CUSTOM_ICON_CLASS;
		await renderStoredIcon(this.plugin, iconEl, iconName);
		contentEl.prepend(iconEl);
	}
}

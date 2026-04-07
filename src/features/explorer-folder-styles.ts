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
	private refreshTimeouts = new Set<number>();

	constructor(private readonly plugin: ObsidianFilenameSearchPlugin) {
		super();
	}

	refresh() {
		this.runRefreshPass();
		this.scheduleRefreshPasses();
	}

	destroy() {
		this.clearScheduledRefreshes();

		for (const leaf of this.plugin.app.workspace.getLeavesOfType(FILE_EXPLORER_VIEW_TYPE)) {
			this.clearStyles(leaf.view.containerEl);
		}

		this.unload();
	}

	private runRefreshPass() {
		const explorerLeaves = this.plugin.app.workspace.getLeavesOfType(FILE_EXPLORER_VIEW_TYPE);
		for (const leaf of explorerLeaves) {
			this.applyStylesToLeaf(leaf);
		}
	}

	private scheduleRefreshPasses() {
		this.clearScheduledRefreshes();
		for (const delay of [120, 360, 900]) {
			const timeoutId = window.setTimeout(() => {
				this.refreshTimeouts.delete(timeoutId);
				this.runRefreshPass();
			}, delay);
			this.refreshTimeouts.add(timeoutId);
		}
	}

	private clearScheduledRefreshes() {
		for (const timeoutId of this.refreshTimeouts) {
			window.clearTimeout(timeoutId);
		}
		this.refreshTimeouts.clear();
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
		const candidates: Array<{
			element: HTMLElement;
			path: string;
			contentSelector: string;
		}> = [];
		const seenElements = new Set<HTMLElement>();

		const addCandidates = (selector: string, contentSelector: string) => {
			for (const element of Array.from(containerEl.querySelectorAll<HTMLElement>(selector))) {
				if (seenElements.has(element)) {
					continue;
				}
				seenElements.add(element);
				candidates.push({
					element,
					path: element.dataset.path ?? "",
					contentSelector,
				});
			}
		};

		addCandidates(".nav-folder-title[data-path]", ".nav-folder-title-content");
		addCandidates(".nav-file-title[data-path]", ".nav-file-title-content");

		// Some Obsidian versions/themes wrap the explorer row differently. Fall back to
		// generic tree rows when the more specific selectors are not present or incomplete.
		addCandidates(".tree-item-self[data-path]:has(.nav-folder-title-content)", ".nav-folder-title-content");
		addCandidates(".tree-item-self[data-path]:has(.nav-file-title-content)", ".nav-file-title-content");

		return candidates;
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

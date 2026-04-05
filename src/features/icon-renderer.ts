import { setIcon, TFile } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";

const VAULT_SVG_PREFIX = "vault-svg:";

export function createVaultSvgIconValue(path: string): string {
	return `${VAULT_SVG_PREFIX}${path}`;
}

export function isVaultSvgIconValue(value: string | null): boolean {
	return Boolean(value?.startsWith(VAULT_SVG_PREFIX));
}

export function getVaultSvgPath(value: string): string {
	return value.slice(VAULT_SVG_PREFIX.length);
}

export function getStoredIconLabel(value: string | null): string | null {
	if (!value) {
		return null;
	}

	if (isVaultSvgIconValue(value)) {
		return getVaultSvgPath(value);
	}

	return value;
}

export async function renderStoredIcon(
	plugin: ObsidianFilenameSearchPlugin,
	containerEl: HTMLElement,
	value: string | null,
	fallbackIcon?: string,
) {
	containerEl.empty();

	if (!value) {
		if (fallbackIcon) {
			setIcon(containerEl, fallbackIcon);
		}
		return;
	}

	if (!isVaultSvgIconValue(value)) {
		setIcon(containerEl, value);
		return;
	}

	const svgPath = getVaultSvgPath(value);
	const abstractFile = plugin.app.vault.getAbstractFileByPath(svgPath);
	if (!(abstractFile instanceof TFile) || abstractFile.extension.toLowerCase() !== "svg") {
		if (fallbackIcon) {
			setIcon(containerEl, fallbackIcon);
		}
		return;
	}

	const svgMarkup = await plugin.app.vault.cachedRead(abstractFile);
	const parser = new DOMParser();
	const documentEl = parser.parseFromString(svgMarkup, "image/svg+xml").documentElement;
	if (documentEl.tagName.toLowerCase() !== "svg") {
		if (fallbackIcon) {
			setIcon(containerEl, fallbackIcon);
		}
		return;
	}

	documentEl.addClass("ofs-svg-icon");
	containerEl.append(documentEl);
}

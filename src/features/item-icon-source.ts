import { TAbstractFile, TFile } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";
import { ExplorerItemStyleRule } from "../settings";
import { createVaultSvgIconValue, isVaultSvgIconValue } from "./icon-renderer";

export interface EffectiveExplorerStyle {
	textColor: string | null;
	backgroundColor: string | null;
	iconName: string | null;
	iconColor: string | null;
	iconBackgroundColor: string | null;
}

export function getMatchingRule(
	rules: ExplorerItemStyleRule[],
	itemPath: string,
): ExplorerItemStyleRule | null {
	const matchingRules = getMatchingRules(rules, itemPath);
	matchingRules.sort((left, right) => right.path.length - left.path.length);
	return matchingRules[0] ?? null;
}

export function getEffectiveStyle(
	rules: ExplorerItemStyleRule[],
	itemPath: string,
): EffectiveExplorerStyle | null {
	// Merge matching rules from parent to child so nested folders can override colors
	// without losing inherited values they did not redefine.
	const matchingRules = getMatchingRules(rules, itemPath)
		.sort((left, right) => left.path.length - right.path.length);

	if (matchingRules.length === 0) {
		return null;
	}

	const effectiveStyle: EffectiveExplorerStyle = {
		textColor: null,
		backgroundColor: null,
		iconName: null,
		iconColor: null,
		iconBackgroundColor: null,
	};

	for (const rule of matchingRules) {
		if (rule.textColor !== null) {
			effectiveStyle.textColor = rule.textColor;
		}
		if (rule.backgroundColor !== null) {
			effectiveStyle.backgroundColor = rule.backgroundColor;
		}
		if (rule.iconName !== null) {
			effectiveStyle.iconName = rule.iconName;
		}
		if (rule.iconColor !== null) {
			effectiveStyle.iconColor = rule.iconColor;
		}
		if (rule.iconBackgroundColor !== null) {
			effectiveStyle.iconBackgroundColor = rule.iconBackgroundColor;
		}
	}

	return effectiveStyle;
}

function getMatchingRules(
	rules: ExplorerItemStyleRule[],
	itemPath: string,
): ExplorerItemStyleRule[] {
	const matchingRules = rules.filter((rule) => {
		if (rule.path === itemPath) {
			return true;
		}

		return rule.itemType === "folder"
			&& rule.includeSubfolders
			&& itemPath.startsWith(`${rule.path}/`);
	});
	return matchingRules;
}

export function getEffectiveItemIconValue(
	plugin: ObsidianFilenameSearchPlugin,
	file: TAbstractFile,
	rule: Pick<EffectiveExplorerStyle, "iconName"> | null,
): string | null {
	if (rule?.iconName) {
		return rule.iconName;
	}

	if (!plugin.settings.useFrontmatterStickerIcons || !(file instanceof TFile)) {
		return null;
	}

	return getStickerIconValue(plugin, file);
}

function getStickerIconValue(
	plugin: ObsidianFilenameSearchPlugin,
	file: TFile,
): string | null {
	const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
	const stickerValue = frontmatter?.sticker;
	if (typeof stickerValue !== "string") {
		return null;
	}

	const normalizedValue = normalizeStickerValue(stickerValue);
	if (!normalizedValue) {
		return null;
	}

	if (isVaultSvgIconValue(normalizedValue)) {
		return normalizedValue;
	}

	if (normalizedValue.toLowerCase().endsWith(".svg")) {
		// Make.md commonly stores sticker paths as vault-relative SVG references.
		const svgFile = plugin.app.vault.getAbstractFileByPath(normalizedValue);
		if (svgFile instanceof TFile && svgFile.extension.toLowerCase() === "svg") {
			return createVaultSvgIconValue(svgFile.path);
		}
	}

	return normalizedValue;
}

function normalizeStickerValue(value: string): string {
	const trimmedValue = decodeURIComponent(value.trim());
	const withoutVaultPrefix = trimmedValue
		.replace(/^vault:\/\//i, "")
		.replace(/^vault\/\//i, "")
		.replace(/^\/+/, "");

	return withoutVaultPrefix.trim();
}

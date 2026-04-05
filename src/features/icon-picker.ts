import { getIconIds, TFile } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";
import { createVaultSvgIconValue, getStoredIconLabel } from "./icon-renderer";

export interface IconCategoryOption {
	value: string;
	label: string;
}

export interface IconPickerOption {
	value: string;
	label: string;
	source: "lucide" | "vault-svg";
}

const ICON_IDS = getIconIds().slice().sort((left, right) => left.localeCompare(right));

const CATEGORY_KEYWORDS: Record<string, string[]> = {
	all: [],
	folders: ["folder", "directory", "archive", "briefcase", "container"],
	files: ["file", "page", "text", "note", "document", "sheet", "book", "receipt"],
	navigation: ["arrow", "chevron", "move", "corner", "route", "map", "compass"],
	status: ["check", "alert", "warning", "info", "help", "shield", "lock", "badge"],
	media: ["image", "video", "music", "audio", "mic", "camera", "film", "play"],
	devices: ["monitor", "laptop", "tablet", "smartphone", "server", "hard-drive", "usb"],
	objects: ["star", "heart", "flag", "tag", "bookmark", "pin", "gift", "box", "package"],
};

export const ICON_CATEGORY_OPTIONS: IconCategoryOption[] = [
	{ value: "all", label: "All" },
	{ value: "folders", label: "Folders" },
	{ value: "files", label: "Files" },
	{ value: "navigation", label: "Navigation" },
	{ value: "status", label: "Status" },
	{ value: "media", label: "Media" },
	{ value: "devices", label: "Devices" },
	{ value: "objects", label: "Objects" },
	{ value: "vault-svg", label: "Vault SVG" },
];

export function getFilteredIcons(
	plugin: ObsidianFilenameSearchPlugin,
	query: string,
	category: string,
): IconPickerOption[] {
	const normalizedQuery = normalize(query);
	const categoryKeywords = CATEGORY_KEYWORDS[category] ?? [];
	const lucideIcons = ICON_IDS.filter((iconId) => {
		if (category === "vault-svg") {
			return false;
		}

		const normalizedIconId = normalize(iconId);
		const matchesCategory = category === "all"
			|| categoryKeywords.some((keyword) => normalizedIconId.includes(normalize(keyword)));

		if (!matchesCategory) {
			return false;
		}

		if (!normalizedQuery) {
			return true;
		}

		return normalizedIconId.includes(normalizedQuery)
			|| normalizedQuery.split(" ").every((token) => normalizedIconId.includes(token));
	}).map((iconId) => ({
		value: iconId,
		label: iconId,
		source: "lucide" as const,
	}));

	const vaultSvgIcons = getVaultSvgIcons(plugin, normalizedQuery, category);
	return [...vaultSvgIcons, ...lucideIcons];
}

export function getInitialIconSearchValue(value: string | null): string {
	return getStoredIconLabel(value) ?? "";
}

function getVaultSvgIcons(
	plugin: ObsidianFilenameSearchPlugin,
	normalizedQuery: string,
	category: string,
): IconPickerOption[] {
	if (category !== "all" && category !== "vault-svg") {
		return [];
	}

	return plugin.app.vault.getFiles()
		.filter((file) => file.extension.toLowerCase() === "svg")
		.filter((file) => matchesSvgQuery(file, normalizedQuery))
		.sort((left, right) => left.path.localeCompare(right.path))
		.map((file) => ({
			value: createVaultSvgIconValue(file.path),
			label: file.path,
			source: "vault-svg" as const,
		}));
}

function matchesSvgQuery(file: TFile, normalizedQuery: string): boolean {
	if (!normalizedQuery) {
		return true;
	}

	const normalizedPath = normalize(file.path);
	const normalizedName = normalize(file.basename);
	return normalizedPath.includes(normalizedQuery)
		|| normalizedName.includes(normalizedQuery)
		|| normalizedQuery.split(" ").every((token) =>
			normalizedPath.includes(token) || normalizedName.includes(token),
		);
}

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

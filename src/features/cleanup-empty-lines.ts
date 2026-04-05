import { MarkdownView, Notice } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";

const LIST_ITEM_PATTERN = /^\s*(?:[-*+]\s+|\d+[.)]\s+|\[[ xX]\]\s+)/;

export async function cleanupActiveMarkdownFile(
	plugin: ObsidianFilenameSearchPlugin,
): Promise<void> {
	const markdownView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!markdownView || !markdownView.file) {
		new Notice(plugin.strings.cleanupNoActiveMarkdown);
		return;
	}

	const editor = markdownView.editor;
	const originalValue = editor.getValue();
	const cleanedValue = cleanupDuplicateEmptyLines(originalValue);

	if (cleanedValue === originalValue) {
		new Notice(plugin.strings.cleanupNoChanges);
		return;
	}

	// Prefer editor updates for the active note so Obsidian can manage dirty state and undo history.
	editor.setValue(cleanedValue);
	new Notice(plugin.strings.cleanupSuccess);
}

export function cleanupDuplicateEmptyLines(content: string): string {
	const normalizedContent = content.replace(/\r\n/g, "\n");
	const lines = normalizedContent.split("\n");
	const cleanedLines: string[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (!isBlankLine(line)) {
			cleanedLines.push(line);
			continue;
		}

		const previousLine = getPreviousNonBlankLine(cleanedLines);
		const nextLine = getNextNonBlankLine(lines, index + 1);
		const previousKeptLine = cleanedLines[cleanedLines.length - 1] ?? null;

		// Copy/paste from AI tools often inserts blank lines between list items. Collapse those first.
		if (previousLine && nextLine && isListLike(previousLine) && isListLike(nextLine)) {
			continue;
		}

		if (previousKeptLine !== undefined && previousKeptLine !== null && isBlankLine(previousKeptLine)) {
			continue;
		}

		cleanedLines.push("");
	}

	return cleanedLines.join("\n").replace(/\n+$/u, "\n");
}

function isBlankLine(line: string | null | undefined): boolean {
	return !line || line.trim().length === 0;
}

function isListLike(line: string): boolean {
	return LIST_ITEM_PATTERN.test(line);
}

function getPreviousNonBlankLine(lines: string[]): string | null {
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		if (!isBlankLine(lines[index])) {
			return lines[index] ?? null;
		}
	}

	return null;
}

function getNextNonBlankLine(lines: string[], startIndex: number): string | null {
	for (let index = startIndex; index < lines.length; index += 1) {
		if (!isBlankLine(lines[index])) {
			return lines[index] ?? null;
		}
	}

	return null;
}

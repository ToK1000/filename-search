import { MarkdownView, Notice } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";
import { CleanupSettings } from "../settings";

const LIST_ITEM_PATTERN = /^\s*(?:[-*+]\s+|\d+[.)]\s+|\[[ xX]\]\s+)/;
const EMPTY_TASK_PATTERN = /^(\s*(?:[-*+]\s+\[[ xX]\]|\[[ xX]\]))\s*$/;
const LABEL_LINE_PATTERN = /^\s*\*\*[^*]+\*\*:\s*$/;
const HEADING_PATTERN = /^\s{0,3}#{1,6}\s+\S.*$/;

export async function cleanupActiveMarkdownFile(
	plugin: ObsidianFilenameSearchPlugin,
): Promise<void> {
	const activeFile = plugin.app.workspace.getActiveFile();
	if (!activeFile || activeFile.extension !== "md") {
		new Notice(plugin.strings.cleanupNoActiveMarkdown);
		return;
	}

	const markdownView = getOpenMarkdownViewForFile(plugin, activeFile.path);
	if (markdownView) {
		const editor = markdownView.editor;
		const originalValue = editor.getValue();
		const cleanedValue = cleanupDuplicateEmptyLines(originalValue, plugin.settings.cleanup);

		if (cleanedValue === originalValue) {
			new Notice(plugin.strings.cleanupNoChanges);
			return;
		}

		// Prefer editor updates for the visible note so Obsidian preserves undo history.
		editor.setValue(cleanedValue);
		new Notice(plugin.strings.cleanupSuccess);
		return;
	}

	let didChange = false;
	await plugin.app.vault.process(activeFile, (content) => {
		const cleanedValue = cleanupDuplicateEmptyLines(content, plugin.settings.cleanup);
		didChange = cleanedValue !== content;
		return cleanedValue;
	});

	if (!didChange) {
		new Notice(plugin.strings.cleanupNoChanges);
		return;
	}

	new Notice(plugin.strings.cleanupSuccess);
}

export function cleanupDuplicateEmptyLines(content: string, options: CleanupSettings): string {
	const normalizedContent = content.replace(/\r\n/g, "\n");
	const lines = normalizedContent.split("\n");
	const cleanedLines: string[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";

		const taskMerge = options.mergeEmptyTasks ? tryMergeEmptyTask(lines, index) : null;
		if (taskMerge) {
			cleanedLines.push(taskMerge.mergedLine);
			index = taskMerge.nextIndex;
			continue;
		}

		const labelMerge = options.mergeBoldLabelParagraphs ? tryMergeLabelParagraph(lines, index) : null;
		if (labelMerge) {
			cleanedLines.push(labelMerge.mergedLine);
			index = labelMerge.nextIndex;
			continue;
		}

		const headingMerge = options.removeHeadingBlankLines ? tryMergeHeadingParagraph(lines, index) : null;
		if (headingMerge) {
			cleanedLines.push(headingMerge.headingLine);
			cleanedLines.push(headingMerge.contentLine);
			index = headingMerge.nextIndex;
			continue;
		}

		if (!isBlankLine(line)) {
			cleanedLines.push(line);
			continue;
		}

		const previousLine = getPreviousNonBlankLine(cleanedLines);
		const nextLine = getNextNonBlankLine(lines, index + 1);
		const previousKeptLine = cleanedLines[cleanedLines.length - 1] ?? null;

		// Copy/paste from AI tools often inserts blank lines between list items. Collapse those first.
		if (options.collapseListBlankLines && previousLine && nextLine && isListLike(previousLine) && isListLike(nextLine)) {
			continue;
		}

		if (options.collapseDuplicateBlankLines && previousKeptLine !== undefined && previousKeptLine !== null && isBlankLine(previousKeptLine)) {
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

function tryMergeEmptyTask(
	lines: string[],
	startIndex: number,
): { mergedLine: string; nextIndex: number } | null {
	const currentLine = lines[startIndex] ?? "";
	const taskMatch = currentLine.match(EMPTY_TASK_PATTERN);
	if (!taskMatch) {
		return null;
	}

	let nextIndex = startIndex + 1;
	while (nextIndex < lines.length && isBlankLine(lines[nextIndex])) {
		nextIndex += 1;
	}

	const nextLine = lines[nextIndex] ?? "";
	if (!nextLine.trim()) {
		return null;
	}

	// This targets AI paste artifacts where the task marker is separated from its text block.
	// We only merge when the following line is indented or plain text rather than another list marker.
	if (LIST_ITEM_PATTERN.test(nextLine)) {
		return null;
	}

	return {
		mergedLine: `${taskMatch[1]} ${nextLine.trim()}`,
		nextIndex,
	};
}

function tryMergeLabelParagraph(
	lines: string[],
	startIndex: number,
): { mergedLine: string; nextIndex: number } | null {
	const currentLine = lines[startIndex] ?? "";
	if (!LABEL_LINE_PATTERN.test(currentLine)) {
		return null;
	}

	let nextIndex = startIndex + 1;
	while (nextIndex < lines.length && isBlankLine(lines[nextIndex])) {
		nextIndex += 1;
	}

	const nextLine = lines[nextIndex] ?? "";
	if (!nextLine.trim() || LIST_ITEM_PATTERN.test(nextLine)) {
		return null;
	}

	return {
		mergedLine: `${currentLine.trim()} ${nextLine.trim()}`,
		nextIndex,
	};
}

function tryMergeHeadingParagraph(
	lines: string[],
	startIndex: number,
): { headingLine: string; contentLine: string; nextIndex: number } | null {
	const currentLine = lines[startIndex] ?? "";
	if (!HEADING_PATTERN.test(currentLine)) {
		return null;
	}

	const nextLine = lines[startIndex + 1] ?? "";
	if (!isBlankLine(nextLine)) {
		return null;
	}

	let nextIndex = startIndex + 2;
	while (nextIndex < lines.length && isBlankLine(lines[nextIndex])) {
		nextIndex += 1;
	}

	const contentLine = lines[nextIndex] ?? "";
	if (!contentLine.trim() || HEADING_PATTERN.test(contentLine)) {
		return null;
	}

	return {
		headingLine: currentLine,
		contentLine: contentLine.trim(),
		nextIndex,
	};
}

function getOpenMarkdownViewForFile(
	plugin: ObsidianFilenameSearchPlugin,
	filePath: string,
): MarkdownView | null {
	const matchingLeaf = plugin.app.workspace.getLeavesOfType("markdown")
		.find((leaf) => leaf.view instanceof MarkdownView && leaf.view.file?.path === filePath);

	return matchingLeaf?.view instanceof MarkdownView ? matchingLeaf.view : null;
}

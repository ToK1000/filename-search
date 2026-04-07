import { Editor, Notice } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";

const HEADING_LINE_PATTERN = /^(\s*(?:>\s*)?(?:[-*+]\s+|\d+[.)]\s+)?)(#{1,6})(\s+.*)$/;

export async function adjustSelectedHeadingLevels(
	plugin: ObsidianFilenameSearchPlugin,
	direction: "up" | "down",
	editorOverride?: Editor,
): Promise<void> {
	const markdownView = plugin.getPreferredMarkdownView();
	const filePath = markdownView?.file?.path;
	const editor = editorOverride ?? markdownView?.editor;
	if (!editor || !filePath) {
		new Notice(plugin.strings.headingAdjustNoActiveMarkdown);
		return;
	}

	let selectedLines = editor.somethingSelected()
		? getSelectedLinesFromCurrentSelection(editor)
		: null;
	const rememberedSelection = plugin.getRememberedMarkdownSelection(filePath);
	if (!selectedLines && rememberedSelection) {
		selectedLines = getSelectedLines(editor, rememberedSelection.startLine, rememberedSelection.endLine);
	}

	if (!selectedLines || !selectedLines.text.trim()) {
		new Notice(plugin.strings.headingAdjustNoSelection);
		return;
	}

	const { text, changedCount } = transformHeadingLevels(selectedLines.text, direction);
	if (changedCount === 0 && rememberedSelection) {
		const rememberedLines = getSelectedLines(editor, rememberedSelection.startLine, rememberedSelection.endLine);
		const rememberedResult = transformHeadingLevels(rememberedLines.text, direction);
		if (rememberedResult.changedCount > 0) {
			selectedLines = rememberedLines;
			editor.replaceRange(
				rememberedResult.text,
				{ line: selectedLines.startLine, ch: 0 },
				{ line: selectedLines.endLine, ch: editor.getLine(selectedLines.endLine).length },
			);
			new Notice(
				direction === "up"
					? plugin.strings.headingAdjustPromoted(rememberedResult.changedCount)
					: plugin.strings.headingAdjustDemoted(rememberedResult.changedCount),
			);
			return;
		}
	}

	if (changedCount === 0) {
		new Notice(plugin.strings.headingAdjustNoHeadingsFound);
		return;
	}

	editor.replaceRange(
		text,
		{ line: selectedLines.startLine, ch: 0 },
		{ line: selectedLines.endLine, ch: editor.getLine(selectedLines.endLine).length },
	);
	new Notice(
		direction === "up"
			? plugin.strings.headingAdjustPromoted(changedCount)
			: plugin.strings.headingAdjustDemoted(changedCount),
	);
}

export function transformHeadingLevels(
	selection: string,
	direction: "up" | "down",
): { text: string; changedCount: number } {
	let changedCount = 0;
	const transformed = selection
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => {
			const match = line.match(HEADING_LINE_PATTERN);
			if (!match) {
				return line;
			}

			const [, indent, hashes, rest] = match;
			if (hashes === undefined || rest === undefined) {
				return line;
			}

			if (direction === "up") {
				if (hashes.length <= 1) {
					return line;
				}

				changedCount += 1;
				return `${indent}${"#".repeat(hashes.length - 1)}${rest}`;
			}

			if (hashes.length >= 6) {
				return line;
			}

			changedCount += 1;
			return `${indent}${"#".repeat(hashes.length + 1)}${rest}`;
		})
		.join("\n");

	return { text: transformed, changedCount };
}

function getSelectedLines(
	editor: Editor,
	startLine: number,
	endLine: number,
): { startLine: number; endLine: number; text: string } {
	const lines: string[] = [];
	for (let line = startLine; line <= endLine; line += 1) {
		lines.push(editor.getLine(line));
	}

	return {
		startLine,
		endLine,
		text: lines.join("\n"),
	};
}

function getSelectedLinesFromCurrentSelection(
	editor: Editor,
): { startLine: number; endLine: number; text: string } {
	const from = editor.getCursor("from");
	const to = editor.getCursor("to");
	const startLine = Math.min(from.line, to.line);
	const endLine = Math.max(from.line, to.line);
	return getSelectedLines(editor, startLine, endLine);
}

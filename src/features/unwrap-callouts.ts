import { Editor, EditorPosition, Notice } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";

const CALLOUT_START_PATTERN = /^>\s*\[!([^[\]]+)\](.*)$/;
const BLOCKQUOTE_LINE_PATTERN = /^>/;

type SelectionRange = {
	from: EditorPosition;
	to: EditorPosition;
	text: string;
};

export async function unwrapSelectedCallouts(
	plugin: ObsidianFilenameSearchPlugin,
	editorOverride?: Editor,
): Promise<void> {
	const markdownView = plugin.getPreferredMarkdownView();
	const filePath = markdownView?.file?.path;
	const editor = editorOverride ?? markdownView?.editor;
	if (!editor || !filePath) {
		new Notice(plugin.strings.calloutUnwrapNoActiveMarkdown);
		return;
	}

	const selection = getSelectionRange(plugin, editor, filePath);
	if (!selection || !selection.text.trim()) {
		new Notice(plugin.strings.calloutUnwrapNoSelection);
		return;
	}

	const calloutBlocks = parseCalloutBlocks(selection.text);
	if (calloutBlocks.length === 0) {
		new Notice(plugin.strings.calloutUnwrapNoCalloutsFound);
		return;
	}

	const plainText = calloutBlocks.map((block) => unwrapCalloutBlock(block)).join("\n\n");
	editor.replaceRange(plainText, selection.from, selection.to);
	new Notice(plugin.strings.calloutUnwrapped(calloutBlocks.length));
}

function getSelectionRange(
	plugin: ObsidianFilenameSearchPlugin,
	editor: Editor,
	filePath: string,
): SelectionRange | null {
	if (editor.somethingSelected()) {
		const from = editor.getCursor("from");
		const to = editor.getCursor("to");
		return {
			from,
			to,
			text: editor.getRange(from, to),
		};
	}

	const rememberedSelection = plugin.getRememberedMarkdownSelection(filePath);
	if (!rememberedSelection) {
		return null;
	}

	const from = {
		line: rememberedSelection.startLine,
		ch: rememberedSelection.startCh,
	};
	const to = {
		line: rememberedSelection.endLine,
		ch: rememberedSelection.endCh,
	};
	return {
		from,
		to,
		text: editor.getRange(from, to),
	};
}

function parseCalloutBlocks(selection: string): string[] {
	const lines = selection.replace(/\r\n/g, "\n").split("\n");
	const blocks: string[] = [];
	let currentBlock: string[] = [];

	const flushBlock = () => {
		if (currentBlock.length === 0) {
			return;
		}
		blocks.push(currentBlock.join("\n").trimEnd());
		currentBlock = [];
	};

	for (const line of lines) {
		if (CALLOUT_START_PATTERN.test(line)) {
			flushBlock();
			currentBlock.push(line);
			continue;
		}

		if (currentBlock.length > 0) {
			if (BLOCKQUOTE_LINE_PATTERN.test(line) || line.trim().length === 0) {
				currentBlock.push(line);
				continue;
			}

			flushBlock();
		}
	}

	flushBlock();
	return blocks.filter((block) => CALLOUT_START_PATTERN.test(block.split("\n")[0] ?? ""));
}

function unwrapCalloutBlock(block: string): string {
	const lines = block.split("\n");
	const firstLine = lines.shift() ?? "";
	const calloutMatch = firstLine.match(CALLOUT_START_PATTERN);
	const explicitTitle = calloutMatch?.[2]?.trim() ?? "";

	const plainLines: string[] = [];
	if (explicitTitle.length > 0) {
		plainLines.push(explicitTitle);
	}

	for (const line of lines) {
		if (line.trim().length === 0) {
			plainLines.push("");
			continue;
		}

		plainLines.push(line.replace(/^>\s?/, ""));
	}

	return plainLines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

import { Editor, EditorPosition, Notice } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";

const CALLOUT_START_PATTERN = /^>\s*\[![^[\]]+\].*$/;
const BLOCKQUOTE_LINE_PATTERN = /^>/;

type SelectionRange = {
	from: EditorPosition;
	to: EditorPosition;
	text: string;
};

export async function mergeSelectedCalloutsIntoColumns(
	plugin: ObsidianFilenameSearchPlugin,
	editorOverride?: Editor,
): Promise<void> {
	const markdownView = plugin.getPreferredMarkdownView();
	const filePath = markdownView?.file?.path;
	const editor = editorOverride ?? markdownView?.editor;
	if (!editor || !filePath) {
		new Notice(plugin.strings.calloutColumnsNoActiveMarkdown);
		return;
	}

	const selection = getSelectionRange(plugin, editor, filePath);
	if (!selection || !selection.text.trim()) {
		new Notice(plugin.strings.calloutColumnsNoSelection);
		return;
	}

	const calloutBlocks = parseCalloutBlocks(selection.text);
	if (calloutBlocks.length < 2) {
		new Notice(plugin.strings.calloutColumnsNeedTwo);
		return;
	}

	const mergedMarkdown = renderColumnsCallout(calloutBlocks);
	editor.replaceRange(mergedMarkdown, selection.from, selection.to);
	new Notice(plugin.strings.calloutColumnsMerged(calloutBlocks.length));
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

function renderColumnsCallout(calloutBlocks: string[]): string {
	const lines: string[] = [];
	lines.push("> [!multi-column]");
	lines.push(">");

	calloutBlocks.forEach((block, index) => {
		for (const blockLine of block.split("\n")) {
			lines.push(`>${blockLine}`);
		}
		if (index < calloutBlocks.length - 1) {
			lines.push(">");
		}
	});

	return lines.join("\n");
}

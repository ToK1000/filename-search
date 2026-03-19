import { TFile } from "obsidian";

export interface FileSearchResult {
	file: TFile;
	score: number;
}

export function searchFiles(files: TFile[], rawQuery: string): FileSearchResult[] {
	const query = normalize(rawQuery);

	const scored = files
		.map((file) => ({
			file,
			score: getFileScore(file, query),
		}))
		.filter((result) => result.score > Number.NEGATIVE_INFINITY)
		.sort((left, right) => {
			if (right.score !== left.score) {
				return right.score - left.score;
			}

			return right.file.stat.mtime - left.file.stat.mtime;
		});

	return scored;
}

function getFileScore(file: TFile, query: string): number {
	if (!query) {
		return 0;
	}

	const basename = normalize(file.basename);
	const path = normalize(file.path);

	if (basename === query) {
		return 5000;
	}

	if (basename.startsWith(query)) {
		return 4000 - basename.length;
	}

	const basenameMatchIndex = basename.indexOf(query);
	if (basenameMatchIndex >= 0) {
		return 3000 - basenameMatchIndex * 5 - basename.length;
	}

	if (path.includes(query)) {
		return 2000 - path.indexOf(query) * 2 - path.length;
	}

	const fuzzyScore = getFuzzyScore(basename, query);
	if (fuzzyScore !== null) {
		return 1000 + fuzzyScore;
	}

	return Number.NEGATIVE_INFINITY;
}

function getFuzzyScore(text: string, query: string): number | null {
	let textIndex = 0;
	let lastMatchIndex = -1;
	let score = 0;

	for (const character of query) {
		const matchIndex = text.indexOf(character, textIndex);
		if (matchIndex === -1) {
			return null;
		}

		score += lastMatchIndex === -1 ? 10 : Math.max(1, 8 - (matchIndex - lastMatchIndex));
		textIndex = matchIndex + 1;
		lastMatchIndex = matchIndex;
	}

	return score - (text.length - query.length);
}

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

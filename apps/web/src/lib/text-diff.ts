export interface DiffToken {
  text: string;
  type: "same" | "removed" | "added";
}

export interface WordDiffResult {
  before: DiffToken[];
  after: DiffToken[];
}

// Splits into words, whitespace runs and punctuation runs separately (e.g. "gates." ->
// ["gates", "."]) so a trailing/leading punctuation difference doesn't drag an otherwise-unchanged
// word into the diff. The three alternatives jointly cover every character, so re-joining the
// tokens always reconstructs the original string exactly.
function tokenize(text: string): string[] {
  return text.match(/\s+|[^\s\w]+|\w+/g) ?? [];
}

/**
 * Word-level diff (LCS-based) between two strings, split on whitespace so spacing is preserved
 * exactly in both outputs. Intended for short CV-bullet-length text (a handful of sentences), not
 * arbitrary document sizes — the DP table is O(tokens(before) * tokens(after)).
 */
export function diffWords(before: string, after: string): WordDiffResult {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;

  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const beforeTokens: DiffToken[] = [];
  const afterTokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      beforeTokens.push({ text: a[i], type: "same" });
      afterTokens.push({ text: b[j], type: "same" });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      beforeTokens.push({ text: a[i], type: "removed" });
      i++;
    } else {
      afterTokens.push({ text: b[j], type: "added" });
      j++;
    }
  }
  while (i < n) {
    beforeTokens.push({ text: a[i], type: "removed" });
    i++;
  }
  while (j < m) {
    afterTokens.push({ text: b[j], type: "added" });
    j++;
  }

  return { before: beforeTokens, after: afterTokens };
}

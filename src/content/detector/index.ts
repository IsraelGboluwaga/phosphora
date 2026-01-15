import { BIBLE_BOOKS } from '@shared/constants';

export interface VerseMatch {
  raw: string;
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  index: number;
}

// Build lookup map: abbreviation -> canonical name
const bookLookup: Record<string, string> = {};
for (const [canonical, variants] of Object.entries(BIBLE_BOOKS)) {
  for (const variant of variants) {
    bookLookup[variant.toLowerCase()] = canonical;
  }
}

// Build regex pattern from all book names, sorted by length (longest first to match "1 John" before "John")
const allBookNames = Object.values(BIBLE_BOOKS)
  .flat()
  .sort((a, b) => b.length - a.length)
  .map(name => name.replace(/\s+/g, '\\s+')) // Allow flexible whitespace
  .join('|');

// Verse separator pattern: matches ":", "v", "vs", "verse" with optional period and spaces
// Examples: "3:16", "3 v 16", "3v16", "3 vs 16", "3 verse 16"
const verseSeparator = '(?::|\\s*(?:vs?\\.?|verse)\\s*)';

// Full verse pattern:
// - Book name (captured)
// - Optional period after abbreviation
// - Required chapter number
// - Optional verse separator + verse, with optional range
const VERSE_PATTERN = new RegExp(
  `\\b(${allBookNames})\\.?\\s*(\\d{1,3})(?:${verseSeparator}(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?)?\\b`,
  'gi'
);

export function detectVerses(text: string): VerseMatch[] {
  const matches: VerseMatch[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  VERSE_PATTERN.lastIndex = 0;

  while ((match = VERSE_PATTERN.exec(text)) !== null) {
    const [raw, bookMatch, chapter, verseStart, verseEnd] = match;

    // Look up canonical book name
    const bookKey = bookMatch.replace(/\s+/g, ' ').toLowerCase();
    const book = bookLookup[bookKey];

    if (!book) continue; // Skip if book not found (shouldn't happen)

    // Validate it's likely a verse reference, not just "John 3" as in "John 3 times"
    // If there's no verse number, check what follows
    if (!verseStart) {
      const afterMatch = text.slice(match.index + raw.length);
      // If followed by common words, skip (false positive)
      if (/^(\s+times|\s+people|\s+years|\s+days|\s+men|\s+women)/i.test(afterMatch)) {
        continue;
      }
    }

    matches.push({
      raw,
      book,
      chapter: parseInt(chapter, 10),
      verseStart: verseStart ? parseInt(verseStart, 10) : undefined,
      verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined,
      index: match.index,
    });
  }

  return matches;
}

export function formatReference(match: VerseMatch): string {
  let ref = `${match.book} ${match.chapter}`;
  if (match.verseStart) {
    ref += `:${match.verseStart}`;
    if (match.verseEnd && match.verseEnd !== match.verseStart) {
      ref += `-${match.verseEnd}`;
    }
  }
  return ref;
}

export interface ReferenceFields {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export function formatReference(ref: ReferenceFields): string {
  let result = `${ref.book} ${ref.chapter}`;
  if (ref.verseStart) {
    result += `:${ref.verseStart}`;
    if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
      result += `-${ref.verseEnd}`;
    }
  }
  return result;
}

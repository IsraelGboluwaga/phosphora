export interface VerseRequest {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export interface VerseResponse {
  reference: string;
  text: string;
  translation: string;
}

export interface ChapterVerse {
  verse: number;
  text: string;
}

export interface ChapterData {
  book: string;
  chapter: number;
  verses: ChapterVerse[];
  translation: string;
}

export interface BibleAPIProvider {
  name: string;
  fetchVerse(request: VerseRequest, translation?: string): Promise<VerseResponse>;
  fetchVerses(requests: VerseRequest[], translation?: string): Promise<VerseResponse[]>;
  fetchChapter(book: string, chapter: number, translation?: string): Promise<ChapterData>;
}

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

export interface BibleAPIProvider {
  name: string;
  fetchVerse(request: VerseRequest, translation?: string): Promise<VerseResponse>;
  fetchVerses(requests: VerseRequest[], translation?: string): Promise<VerseResponse[]>;
}

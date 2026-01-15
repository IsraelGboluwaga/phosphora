export interface VerseReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  raw: string;
}

export interface VerseContent {
  reference: string;
  text: string;
  translation: string;
}

export interface UserSettings {
  enabled: boolean;
  translation: string;
  highlightColor: string;
  highlightStyle: 'background' | 'underline' | 'both';
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export type MessageType =
  | { type: 'FETCH_VERSE'; payload: VerseReference }
  | { type: 'VERSE_RESULT'; payload: VerseContent }
  | { type: 'OPEN_SIDEPANEL'; payload: VerseReference }
  | { type: 'SETTINGS_CHANGED'; payload: Partial<UserSettings> };

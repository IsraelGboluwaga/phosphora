import { bollsProvider } from './providers/bolls';

// Swap provider by changing this line
export const bibleApi = bollsProvider;

export type { BibleAPIProvider, ChapterData, ChapterVerse, VerseRequest, VerseResponse } from './types';

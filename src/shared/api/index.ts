import { bollsProvider } from './providers/bolls';
import type { ChapterData, VerseRequest, VerseResponse } from './types';

// Swap provider by changing this line
export const bibleApi = bollsProvider;

// Convenience exports
export async function fetchVerse(request: VerseRequest, translation?: string): Promise<VerseResponse> {
  return bibleApi.fetchVerse(request, translation);
}

export async function fetchVerses(requests: VerseRequest[], translation?: string): Promise<VerseResponse[]> {
  return bibleApi.fetchVerses(requests, translation);
}

export async function fetchChapter(book: string, chapter: number, translation?: string): Promise<ChapterData> {
  return bibleApi.fetchChapter(book, chapter, translation);
}

export type { BibleAPIProvider, ChapterData, ChapterVerse, VerseRequest, VerseResponse } from './types';

import { bollsProvider } from './providers/bolls';
import type { VerseRequest, VerseResponse } from './types';

// Swap provider by changing this line
export const bibleApi = bollsProvider;

// Convenience exports
export async function fetchVerse(request: VerseRequest, translation?: string): Promise<VerseResponse> {
  return bibleApi.fetchVerse(request, translation);
}

export async function fetchVerses(requests: VerseRequest[], translation?: string): Promise<VerseResponse[]> {
  return bibleApi.fetchVerses(requests, translation);
}

export type { BibleAPIProvider, VerseRequest, VerseResponse } from './types';

import { bibleApi } from '@shared/api';
import type { ChapterData, VerseRequest } from '@shared/api';

// Allow panel to open on action click, manage per-tab visibility via onActivated
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Track tabs with active side panels
const activePanelTabs = new Set<number>();
let lastActiveTabId: number | null = null;

// When switching tabs, disable panel on the tab we're leaving (if it was active)
// and enable on the tab we're switching to (if it's in our active set)
chrome.tabs.onActivated.addListener(({ tabId }) => {
  // Disable panel on the tab we're leaving
  if (lastActiveTabId !== null && activePanelTabs.has(lastActiveTabId)) {
    chrome.sidePanel.setOptions({ tabId: lastActiveTabId, enabled: false });
  }

  // Enable panel on new tab if it's in our active set
  if (activePanelTabs.has(tabId)) {
    chrome.sidePanel.setOptions({ tabId, enabled: true });
  }

  lastActiveTabId = tabId;
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activePanelTabs.delete(tabId);
  if (lastActiveTabId === tabId) {
    lastActiveTabId = null;
  }
});

// Cache key prefix for verse storage
const CACHE_PREFIX = 'verse:';

function getCacheKey(ref: string): string {
  return `${CACHE_PREFIX}${ref}`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CACHED_VERSE') {
    const { reference } = message.payload;
    const cacheKey = getCacheKey(reference);
    chrome.storage.session.get(cacheKey).then((result) => {
      sendResponse(result[cacheKey] || null);
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'PREFETCH_VERSES') {
    const requests: VerseRequest[] = message.payload;

    bibleApi
      .fetchVerses(requests)
      .then((responses) => {
        // Store each verse in session storage
        const cacheEntries: Record<string, unknown> = {};
        for (const res of responses) {
          cacheEntries[getCacheKey(res.reference)] = {
            reference: res.reference,
            text: res.text,
            translation: res.translation,
          };
        }
        chrome.storage.session.set(cacheEntries);
        console.log(`[Phosphora] Prefetched ${responses.length} verses`);
      })
      .catch((error) => {
        console.error('[Phosphora] Failed to prefetch verses:', error);
      });
  }

  if (message.type === 'SHOW_VERSE') {
    const { reference, book, chapter, verseStart, verseEnd } = message.payload;

    // Open side panel for this tab
    const tabId = sender.tab?.id;
    if (tabId) {
      activePanelTabs.add(tabId);
      chrome.sidePanel.open({ tabId });
    }

    // Store verse data per-tab so each tab has its own content
    const verseKey = tabId ? `currentVerse:${tabId}` : 'currentVerse';

    // If verseStart is defined, fetch full chapter with highlighting
    // Otherwise (chapter-only reference), use old behavior
    if (verseStart) {
      const chapterCacheKey = `chapter:${book}:${chapter}`;

      chrome.storage.session.get(chapterCacheKey).then((result) => {
        if (result[chapterCacheKey]) {
          // Use cached chapter data with new highlight info
          const chapterData = result[chapterCacheKey] as ChapterData;
          chrome.storage.session.set({
            [verseKey]: {
              type: 'chapter',
              book,
              chapter,
              verses: chapterData.verses,
              translation: chapterData.translation,
              highlightStart: verseStart,
              highlightEnd: verseEnd || verseStart,
            },
          });
        } else {
          // Set loading state
          chrome.storage.session.set({
            [verseKey]: { type: 'loading', reference },
          });

          bibleApi
            .fetchChapter(book, chapter)
            .then((chapterData) => {
              // Cache the chapter data
              chrome.storage.session.set({ [chapterCacheKey]: chapterData });
              // Display with highlight info
              chrome.storage.session.set({
                [verseKey]: {
                  type: 'chapter',
                  book,
                  chapter,
                  verses: chapterData.verses,
                  translation: chapterData.translation,
                  highlightStart: verseStart,
                  highlightEnd: verseEnd || verseStart,
                },
              });
            })
            .catch((error) => {
              console.error('[Phosphora] Failed to fetch chapter:', error);
              chrome.storage.session.set({
                [verseKey]: { type: 'error', reference, text: 'Failed to load chapter.' },
              });
            });
        }
      });
    } else {
      // Chapter-only reference - use old behavior (just show the chapter text)
      const cacheKey = getCacheKey(reference);
      chrome.storage.session.get(cacheKey).then((result) => {
        if (result[cacheKey]) {
          chrome.storage.session.set({ [verseKey]: result[cacheKey] });
        } else {
          chrome.storage.session.set({
            [verseKey]: { reference, text: 'Loading...' },
          });

          bibleApi
            .fetchVerse({ book, chapter, verseStart, verseEnd })
            .then((response) => {
              const verseData = {
                reference: response.reference,
                text: response.text,
                translation: response.translation,
              };
              chrome.storage.session.set({
                [cacheKey]: verseData,
                [verseKey]: verseData,
              });
            })
            .catch((error) => {
              console.error('[Phosphora] Failed to fetch verse:', error);
              chrome.storage.session.set({
                [verseKey]: { reference, text: 'Failed to load verse.' },
              });
            });
        }
      });
    }
  }

  return true;
});

console.log('[Phosphora] Background service worker loaded');

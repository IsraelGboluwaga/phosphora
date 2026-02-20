import { bibleApi } from '@shared/api';
import type { ChapterData, VerseRequest } from '@shared/api';

// Allow panel to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Track tabs where panel has been opened (via extension icon)
const openPanelTabs = new Set<number>();

// Track tabs where panel is enabled (has verses)
const enabledTabs = new Set<number>();

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  openPanelTabs.delete(tabId);
  enabledTabs.delete(tabId);
  // Clear badge if this tab had one (ignore errors for already-closed tabs)
  chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
});

// When switching tabs, close panel for tabs that haven't been enabled
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!enabledTabs.has(tabId)) {
    // This tab hasn't had ENABLE_PANEL sent (no verses or pre-opened tab)
    // Close the panel for this tab
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId) {
        await (chrome.sidePanel as typeof chrome.sidePanel & { close(options: { tabId: number }): Promise<void> }).close({ tabId });
      }
    } catch {
      // Tab may not exist or panel already closed - ignore
    }
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
    return; // No response needed
  }

  // Content script enables panel when page has verses
  if (message.type === 'ENABLE_PANEL') {
    const tabId = sender.tab?.id;
    if (tabId) {
      enabledTabs.add(tabId);
      chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });
    }
    return; // No response needed
  }

  // Content script disables panel when page has no verses
  if (message.type === 'DISABLE_PANEL') {
    const tabId = sender.tab?.id;
    if (tabId) {
      enabledTabs.delete(tabId);
      chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: false });
    }
    return; // No response needed
  }

  // Sidepanel notifies us when it's opened
  if (message.type === 'PANEL_OPENED') {
    const { tabId } = message.payload;
    if (tabId) {
      openPanelTabs.add(tabId);
      // Clear badge since panel is now open
      chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
    }
    return; // No response needed
  }

  if (message.type === 'SHOW_VERSE') {
    const { reference, book, chapter, verseStart, verseEnd } = message.payload;
    const tabId = sender.tab?.id;

    // If panel isn't open yet for this tab, show badge to prompt user
    if (tabId && !openPanelTabs.has(tabId)) {
      chrome.action.setBadgeText({ text: '1', tabId }).catch(() => {});
      chrome.action.setBadgeBackgroundColor({ color: '#a8d86e', tabId }).catch(() => {});
      // Tell content script to show a hint
      sendResponse({ showHint: true });
    } else {
      sendResponse({ showHint: false });
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

    return true; // Keep channel open for async response (sendResponse called above)
  }
});

console.log('[Phosphora] Background service worker loaded');

interface VerseData {
  reference: string;
  text: string;
  translation?: string;
}

interface ChapterVerse {
  verse: number;
  text: string;
}

interface ChapterDisplayData {
  type: 'chapter';
  book: string;
  chapter: number;
  verses: ChapterVerse[];
  translation: string;
  highlightStart: number;
  highlightEnd: number;
}

interface LoadingData {
  type: 'loading';
  reference: string;
}

interface ErrorData {
  type: 'error';
  reference: string;
  text: string;
}

type PanelData = VerseData | ChapterDisplayData | LoadingData | ErrorData;

const contentEl = document.getElementById('content')!;

function isChapterData(data: PanelData): data is ChapterDisplayData {
  return 'type' in data && data.type === 'chapter';
}

function isLoadingData(data: PanelData): data is LoadingData {
  return 'type' in data && data.type === 'loading';
}

function isErrorData(data: PanelData): data is ErrorData {
  return 'type' in data && data.type === 'error';
}

function renderChapter(data: ChapterDisplayData) {
  const reference = `${data.book} ${data.chapter} (${data.translation})`;

  const versesHtml = data.verses
    .map((v) => {
      const isHighlighted = v.verse >= data.highlightStart && v.verse <= data.highlightEnd;
      const highlightClass = isHighlighted ? ' highlighted' : '';
      const highlightId = isHighlighted ? ` id="verse-${v.verse}"` : '';
      return `<div class="chapter-verse${highlightClass}"${highlightId}><span class="verse-num">${v.verse}</span> ${v.text}</div>`;
    })
    .join('');

  contentEl.innerHTML = `
    <div class="chapter-view">
      <div class="chapter-header">${reference}</div>
      <div class="chapter-content">${versesHtml}</div>
    </div>
  `;

  // Scroll to highlighted verse after render
  requestAnimationFrame(() => {
    const highlightedEl = document.getElementById(`verse-${data.highlightStart}`);
    if (highlightedEl) {
      highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function renderVerse(verse: VerseData) {
  const ref = verse.translation
    ? `${verse.reference} (${verse.translation})`
    : verse.reference;
  contentEl.innerHTML = `
    <div class="verse-list">
      <div class="verse-card">
        <div class="verse-reference">${ref}</div>
        <div class="verse-text">${verse.text}</div>
      </div>
    </div>
  `;
}

function renderLoading(reference: string) {
  contentEl.innerHTML = `
    <div class="loading-state">
      <p>Loading ${reference}...</p>
    </div>
  `;
}

function renderError(reference: string, text: string) {
  contentEl.innerHTML = `
    <div class="error-state">
      <p><strong>${reference}</strong></p>
      <p>${text}</p>
    </div>
  `;
}

function renderData(data: PanelData) {
  if (isChapterData(data)) {
    renderChapter(data);
  } else if (isLoadingData(data)) {
    renderLoading(data.reference);
  } else if (isErrorData(data)) {
    renderError(data.reference, data.text);
  } else {
    renderVerse(data);
  }
}

let currentTabId: number | null = null;

async function getCurrentTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id ?? null;
}

function getVerseKey(tabId: number | null): string {
  return tabId ? `currentVerse:${tabId}` : 'currentVerse';
}

async function loadCurrentVerse() {
  currentTabId = await getCurrentTabId();
  const verseKey = getVerseKey(currentTabId);
  const result = await chrome.storage.session.get(verseKey);
  if (result[verseKey]) {
    renderData(result[verseKey]);
  }
}

chrome.storage.session.onChanged.addListener((changes) => {
  const verseKey = getVerseKey(currentTabId);
  if (changes[verseKey]?.newValue) {
    renderData(changes[verseKey].newValue);
  }
});

loadCurrentVerse();

console.log('[Phosphora] Side panel loaded');

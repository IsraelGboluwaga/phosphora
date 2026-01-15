interface VerseData {
  reference: string;
  text: string;
  translation?: string;
}

const contentEl = document.getElementById('content')!;

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
    renderVerse(result[verseKey]);
  }
}

chrome.storage.session.onChanged.addListener((changes) => {
  const verseKey = getVerseKey(currentTabId);
  if (changes[verseKey]?.newValue) {
    renderVerse(changes[verseKey].newValue);
  }
});

loadCurrentVerse();

console.log('[Phosphora] Side panel loaded');

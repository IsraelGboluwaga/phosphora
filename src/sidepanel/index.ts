import { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY, type ThemeColors } from '@shared/themes';
import type { ChapterVerse } from '@shared/api/types';
import { BIBLE_BOOKS, BOOK_NUMBERS, BOOK_CHAPTER_COUNTS } from '@shared/constants';
import { stripHtml } from '@shared/utils';

// --- Theme Management ---

const themePickerEl = document.getElementById('theme-picker')!;

function applyThemeToRoot(theme: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty('--phosphora-highlight-bg', theme.highlightBg);
  root.style.setProperty('--phosphora-highlight-hover', theme.highlightHover);
  root.style.setProperty('--phosphora-accent', theme.accent);
  root.style.setProperty('--phosphora-text-primary', theme.textPrimary);
  root.style.setProperty('--phosphora-text-secondary', theme.textSecondary);
  root.style.setProperty('--phosphora-text-muted', theme.textMuted);
  root.style.setProperty('--phosphora-surface', theme.surface);
  root.style.setProperty('--phosphora-verse-num', theme.verseNum);
  root.style.setProperty('--phosphora-dark-highlight-bg', theme.darkHighlightBg);
  root.style.setProperty('--phosphora-dark-highlight-hover', theme.darkHighlightHover);
  root.style.setProperty('--phosphora-dark-accent', theme.darkAccent);
  root.style.setProperty('--phosphora-dark-text', theme.darkText);
}

function setActiveDot(themeName: string) {
  themePickerEl.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.classList.toggle('active', (dot as HTMLElement).dataset.theme === themeName);
  });
}

function buildThemePicker(activeTheme: string) {
  themePickerEl.innerHTML = '';
  for (const [name, colors] of Object.entries(THEMES)) {
    const dot = document.createElement('button');
    dot.className = 'theme-dot';
    dot.dataset.theme = name;
    dot.style.backgroundColor = colors.accent;
    dot.title = name.charAt(0).toUpperCase() + name.slice(1);
    if (name === activeTheme) dot.classList.add('active');
    dot.addEventListener('click', () => selectTheme(name));
    themePickerEl.appendChild(dot);
  }
}

function selectTheme(themeName: string) {
  const theme = THEMES[themeName] ?? THEMES[DEFAULT_THEME];
  applyThemeToRoot(theme);
  setActiveDot(themeName);
  chrome.storage.sync.set({ [THEME_STORAGE_KEY]: themeName });
}

async function initTheme() {
  const result = await chrome.storage.sync.get(THEME_STORAGE_KEY);
  const themeName: string = result[THEME_STORAGE_KEY] ?? DEFAULT_THEME;
  const theme = THEMES[themeName] ?? THEMES[DEFAULT_THEME];
  applyThemeToRoot(theme);
  buildThemePicker(themeName);
}

initTheme();

// --- Tab Management ---

const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
const tabPanels = document.querySelectorAll<HTMLElement>('.tab-panel');

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
    tabPanels.forEach((p) => p.classList.toggle('active', p.id === `${tab}-panel`));
  });
});

// --- Verse Display (existing tab) ---

interface VerseData {
  reference: string;
  text: string;
  translation?: string;
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

  // Notify background that panel is now open for this tab
  if (currentTabId) {
    chrome.runtime.sendMessage({ type: 'PANEL_OPENED', payload: { tabId: currentTabId } });
  }

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

// Update content when switching tabs
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  currentTabId = tabId;
  const verseKey = getVerseKey(tabId);
  const result = await chrome.storage.session.get(verseKey);
  if (result[verseKey]) {
    renderData(result[verseKey]);
  }
});

loadCurrentVerse();

// --- Browse Tab ---

const bookSelect = document.getElementById('book-select') as HTMLSelectElement;
const chapterSelect = document.getElementById('chapter-select') as HTMLSelectElement;
const verseSelect = document.getElementById('verse-select') as HTMLSelectElement;
const browseContentEl = document.getElementById('browse-content')!;

const TRANSLATION = 'NKJV';
const BASE_URL = 'https://bolls.life';

// Populate book select
for (const book of Object.keys(BIBLE_BOOKS)) {
  const option = document.createElement('option');
  option.value = book;
  option.textContent = book;
  bookSelect.appendChild(option);
}

bookSelect.addEventListener('change', () => {
  const book = bookSelect.value;

  chapterSelect.innerHTML = '<option value="">Chapter</option>';
  verseSelect.innerHTML = '<option value="">Verse</option>';
  verseSelect.disabled = true;
  browseContentEl.innerHTML = '<div class="empty-state"><p>Select a chapter to read.</p></div>';

  if (!book) {
    chapterSelect.disabled = true;
    return;
  }

  const count = BOOK_CHAPTER_COUNTS[book] ?? 1;
  for (let i = 1; i <= count; i++) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = String(i);
    chapterSelect.appendChild(option);
  }
  chapterSelect.disabled = false;
});

chapterSelect.addEventListener('change', async () => {
  const book = bookSelect.value;
  const chapter = parseInt(chapterSelect.value, 10);

  verseSelect.innerHTML = '<option value="">Verse</option>';
  verseSelect.disabled = true;

  if (!book || !chapter) return;

  browseContentEl.innerHTML = `<div class="loading-state"><p>Loading ${book} ${chapter}...</p></div>`;

  try {
    const bookNum = BOOK_NUMBERS[book];
    const response = await fetch(`${BASE_URL}/get-text/${TRANSLATION}/${bookNum}/${chapter}/`);
    if (!response.ok) throw new Error('fetch failed');

    const data: { verse: number; text: string }[] = await response.json();
    const verses: ChapterVerse[] = data.map((v) => ({ verse: v.verse, text: stripHtml(v.text) }));

    renderBrowseChapter(book, chapter, verses);

    for (const v of verses) {
      const option = document.createElement('option');
      option.value = String(v.verse);
      option.textContent = String(v.verse);
      verseSelect.appendChild(option);
    }
    verseSelect.disabled = false;
  } catch {
    browseContentEl.innerHTML = `<div class="error-state"><p>Failed to load ${book} ${chapter}.</p></div>`;
  }
});

verseSelect.addEventListener('change', () => {
  const verse = parseInt(verseSelect.value, 10);
  if (!verse) return;

  browseContentEl.querySelectorAll<HTMLElement>('.chapter-verse.highlighted').forEach((el) => {
    el.classList.remove('highlighted');
  });

  const verseEl = browseContentEl.querySelector<HTMLElement>(`[data-verse="${verse}"]`);
  if (verseEl) {
    verseEl.classList.add('highlighted');
    verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

function renderBrowseChapter(book: string, chapter: number, verses: ChapterVerse[]) {
  const versesHtml = verses
    .map(
      (v) =>
        `<div class="chapter-verse" data-verse="${v.verse}"><span class="verse-num">${v.verse}</span> ${v.text}</div>`
    )
    .join('');

  browseContentEl.innerHTML = `
    <div class="chapter-view">
      <div class="chapter-header">${book} ${chapter} (${TRANSLATION})</div>
      <div class="chapter-content">${versesHtml}</div>
    </div>
  `;
}

console.log('[Phosphora] Side panel loaded');

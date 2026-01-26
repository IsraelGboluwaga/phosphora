import { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY, type ThemeColors } from '@shared/themes';

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

// --- Verse Display ---

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

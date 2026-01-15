import { detectVerses, formatReference, VerseMatch } from './detector';

const DUMMY_TEXT = 'Verse text will appear here once API integration is complete.';

let tooltip: HTMLDivElement | null = null;

function createTooltip(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'phosphora-tooltip';
  document.body.appendChild(el);
  return el;
}

function showTooltip(target: HTMLElement, text: string) {
  if (!tooltip) tooltip = createTooltip();

  const rect = target.getBoundingClientRect();
  tooltip.textContent = text;
  tooltip.classList.add('visible');
  tooltip.style.top = `${window.scrollY + rect.bottom + 8}px`;
  tooltip.style.left = `${window.scrollX + rect.left}px`;
}

function hideTooltip() {
  if (tooltip) {
    tooltip.classList.remove('visible');
  }
}

function sendVerseToSidePanel(reference: string, verseData: VerseMatch) {
  chrome.runtime.sendMessage({
    type: 'SHOW_VERSE',
    payload: {
      reference: reference,
      text: DUMMY_TEXT,
      book: verseData.book,
      chapter: verseData.chapter,
      verseStart: verseData.verseStart,
      verseEnd: verseData.verseEnd,
    }
  });
}

function wrapMatches(textNode: Text): void {
  const text = textNode.textContent || '';
  const matches = detectVerses(text);

  if (matches.length === 0) return;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const match of matches) {
    // Add text before this match
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    // Create highlighted span
    const span = document.createElement('span');
    span.className = 'phosphora-verse';
    span.dataset.verse = formatReference(match);
    span.dataset.book = match.book;
    span.dataset.chapter = String(match.chapter);
    if (match.verseStart) span.dataset.verseStart = String(match.verseStart);
    if (match.verseEnd) span.dataset.verseEnd = String(match.verseEnd);
    span.textContent = match.raw;
    fragment.appendChild(span);

    lastIndex = match.index + match.raw.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode?.replaceChild(fragment, textNode);
}

function processDocument(): void {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('.phosphora-verse')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.isContentEditable) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  textNodes.forEach(textNode => wrapMatches(textNode));
}

function init() {
  processDocument();

  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('phosphora-verse')) {
      const ref = target.dataset.verse || '';
      showTooltip(target, `${ref}\n${DUMMY_TEXT}`);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('phosphora-verse')) {
      hideTooltip();
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('phosphora-verse')) {
      const reference = target.dataset.verse || '';
      const verseData: VerseMatch = {
        raw: target.textContent || '',
        book: target.dataset.book || '',
        chapter: parseInt(target.dataset.chapter || '0', 10),
        verseStart: target.dataset.verseStart ? parseInt(target.dataset.verseStart, 10) : undefined,
        verseEnd: target.dataset.verseEnd ? parseInt(target.dataset.verseEnd, 10) : undefined,
        index: 0,
      };
      sendVerseToSidePanel(reference, verseData);
    }
  });

  console.log('[Phosphora] Content script loaded');
}

init();

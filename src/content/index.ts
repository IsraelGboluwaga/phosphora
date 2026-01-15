import { detectVerses, formatReference, VerseMatch } from './detector';

let tooltip: HTMLDivElement | null = null;

function createTooltip(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'phosphora-tooltip';
  document.body.appendChild(el);
  return el;
}

function showTooltip(target: HTMLElement, html: string) {
  if (!tooltip) tooltip = createTooltip();

  const rect = target.getBoundingClientRect();
  tooltip.innerHTML = html;
  tooltip.classList.add('visible');
  tooltip.style.top = `${window.scrollY + rect.bottom + 8}px`;
  tooltip.style.left = `${window.scrollX + rect.left}px`;
}

let hideTimeout: number | null = null;

function hideTooltip() {
  if (tooltip) {
    tooltip.classList.remove('visible');
  }
}

function hideTooltipWithDelay() {
  hideTimeout = window.setTimeout(() => {
    hideTooltip();
    hideTimeout = null;
  }, 100);
}

function cancelHideTooltip() {
  if (hideTimeout !== null) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}

function sendVerseToSidePanel(reference: string, verseData: VerseMatch) {
  if (!chrome.runtime?.id) return; // Extension context invalidated
  chrome.runtime.sendMessage({
    type: 'SHOW_VERSE',
    payload: {
      reference,
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

function prefetchVerses() {
  const verseElements = document.querySelectorAll('.phosphora-verse');
  const requests: Array<{
    book: string;
    chapter: number;
    verseStart?: number;
    verseEnd?: number;
  }> = [];

  verseElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const book = htmlEl.dataset.book;
    const chapter = htmlEl.dataset.chapter;
    const verseStart = htmlEl.dataset.verseStart;
    const verseEnd = htmlEl.dataset.verseEnd;

    if (book && chapter) {
      requests.push({
        book,
        chapter: parseInt(chapter, 10),
        verseStart: verseStart ? parseInt(verseStart, 10) : undefined,
        verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined,
      });
    }
  });

  if (requests.length > 0 && chrome.runtime?.id) {
    chrome.runtime.sendMessage({ type: 'PREFETCH_VERSES', payload: requests });
  }
}

function init() {
  processDocument();
  prefetchVerses();

  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;

    // Cancel hide if entering tooltip
    if (target.id === 'phosphora-tooltip' || target.closest('#phosphora-tooltip')) {
      cancelHideTooltip();
      return;
    }

    if (target.classList.contains('phosphora-verse')) {
      cancelHideTooltip();
      const ref = target.dataset.verse || '';

      // Request cached verse from background
      if (!chrome.runtime?.id) {
        showTooltip(target, `<strong>${ref}</strong>`);
        return;
      }
      chrome.runtime.sendMessage(
        { type: 'GET_CACHED_VERSE', payload: { reference: ref } },
        (response) => {
          if (response?.text) {
            showTooltip(target, `<strong>${response.reference}</strong> (${response.translation})<br>${response.text}`);
          } else {
            showTooltip(target, `<strong>${ref}</strong>`);
          }
        }
      );
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;

    // Start delayed hide when leaving verse or tooltip
    if (target.classList.contains('phosphora-verse') ||
        target.id === 'phosphora-tooltip' ||
        target.closest('#phosphora-tooltip')) {
      hideTooltipWithDelay();
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

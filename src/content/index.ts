const VERSE_PATTERN = /\b(John\s+3:16)\b/gi;

const DUMMY_TEXT = 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.';

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

function sendVerseToSidePanel(reference: string) {
  chrome.runtime.sendMessage({
    type: 'SHOW_VERSE',
    payload: {
      reference: reference,
      text: DUMMY_TEXT
    }
  });
}

function wrapMatches(textNode: Text, pattern: RegExp): void {
  const text = textNode.textContent || '';
  const matches = text.match(pattern);

  if (!matches) return;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  text.replace(pattern, (match, _group, offset) => {
    if (offset > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
    }

    const span = document.createElement('span');
    span.className = 'phosphora-verse';
    span.dataset.verse = match;
    span.textContent = match;
    fragment.appendChild(span);

    lastIndex = offset + match.length;
    return match;
  });

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
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('.phosphora-verse')) {
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

  textNodes.forEach(textNode => wrapMatches(textNode, VERSE_PATTERN));
}

function init() {
  processDocument();

  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('phosphora-verse')) {
      showTooltip(target, DUMMY_TEXT);
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
      const reference = target.dataset.verse || target.textContent || '';
      sendVerseToSidePanel(reference);
    }
  });

  console.log('[Phosphora] Content script loaded');
}

init();

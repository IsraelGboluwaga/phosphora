interface VerseData {
  reference: string;
  text: string;
}

const contentEl = document.getElementById('content')!;

function renderVerse(verse: VerseData) {
  contentEl.innerHTML = `
    <div class="verse-list">
      <div class="verse-card">
        <div class="verse-reference">${verse.reference}</div>
        <div class="verse-text">${verse.text}</div>
      </div>
    </div>
  `;
}

function renderEmpty() {
  contentEl.innerHTML = `
    <div class="empty-state">
      <p>Click on a highlighted verse reference to see it here.</p>
    </div>
  `;
}

async function loadCurrentVerse() {
  const result = await chrome.storage.session.get('currentVerse');
  if (result.currentVerse) {
    renderVerse(result.currentVerse);
  }
}

chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.currentVerse?.newValue) {
    renderVerse(changes.currentVerse.newValue);
  }
});

loadCurrentVerse();

console.log('[Phosphora] Side panel loaded');

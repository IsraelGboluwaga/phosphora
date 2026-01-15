chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
  if (message.type === 'SHOW_VERSE') {
    chrome.storage.session.set({ currentVerse: message.payload });

    // Open side panel when verse is clicked
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
  }
  return true;
});

console.log('[Phosphora] Background service worker loaded');

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const guideBtn = document.getElementById('guide-tab-btn');
  const openClassroomBtn = document.getElementById('open-classroom-btn');

  // Check backend health
  chrome.runtime.sendMessage({ type: 'CHECK_BACKEND_HEALTH' }, (response) => {
    if (response?.status === 'online') {
      statusEl.textContent = 'Backend Online (Port 8000)';
      statusEl.classList.remove('offline');
    } else {
      statusEl.textContent = 'Backend Offline';
      statusEl.classList.add('offline');
    }
  });

  guideBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SHOW_STEP_GUIDANCE', step: {
        id: 'step_manual_start',
        what: 'Professor Nova is active on this tab.',
        why: 'You can now explore, learn, or ask questions about any element on this page.',
        next: 'Click "Analyze This Page" on the floating Nova pill.',
      }});
      window.close();
    }
  });

  openClassroomBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
    window.close();
  });
});

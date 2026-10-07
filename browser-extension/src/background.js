/**
 * LEARNOVA Browser Companion — Background Service Worker
 * Bridges Chrome tabs with the local LEARNOVA backend API (http://localhost:8000).
 */

const API_BASE = 'http://localhost:8000';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LEARNOVA Extension] Background service worker initialized.');
});

// Relay messages between Content Scripts, Popup, and Backend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STEP_VERIFIED') {
    // Notify LEARNOVA Backend of step verification
    fetch(`${API_BASE}/api/screen/verify-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step_id: request.stepId,
        page_url: request.url,
        action_type: 'click',
        timestamp: Date.now(),
      }),
    })
      .then(res => res.json())
      .then(data => console.log('[LEARNOVA Extension] Step verification acknowledged by backend:', data))
      .catch(err => console.warn('[LEARNOVA Extension] Backend communication error:', err));

    sendResponse({ received: true });
    return true;
  }

  if (request.type === 'CHECK_BACKEND_HEALTH') {
    fetch(`${API_BASE}/api/health`)
      .then(res => res.json())
      .then(data => sendResponse({ status: 'online', data }))
      .catch(err => sendResponse({ status: 'offline', error: err.message }));
    return true; // async sendResponse
  }
});

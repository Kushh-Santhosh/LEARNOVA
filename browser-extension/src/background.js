/**
 * LEARNOVA Browser Companion — Background Service Worker
 * Bridges Chrome tabs with the LEARNOVA backend API.
 * Defaults to http://localhost:8000, with optional chrome.storage override for production.
 */

const DEFAULT_API_BASE = 'http://localhost:8000';

async function getApiBase() {
  try {
    const data = await chrome.storage?.sync?.get('custom_api_url') || {};
    return data.custom_api_url || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LEARNOVA Extension] Background service worker initialized.');
});

// Relay messages between Content Scripts, Popup, and Backend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STEP_VERIFIED') {
    getApiBase().then(apiBase => {
      fetch(`${apiBase}/api/screen/verify-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: 'web_learning',
          step_number: 1,
          current_route: request.url,
          user_action: 'clicked',
          dom_evidence: { url: request.url, step_id: request.stepId }
        }),
      })
        .then(res => res.json())
        .then(data => console.log('[LEARNOVA Extension] Step verification acknowledged by backend:', data))
        .catch(err => console.warn('[LEARNOVA Extension] Backend communication error:', err));
    });

    sendResponse({ received: true });
    return true;
  }

  if (request.type === 'CHECK_BACKEND_HEALTH') {
    getApiBase().then(apiBase => {
      fetch(`${apiBase}/api/health`)
        .then(res => res.json())
        .then(data => sendResponse({ status: 'online', apiBase, data }))
        .catch(err => sendResponse({ status: 'offline', apiBase, error: err.message }));
    });
    return true; // async sendResponse
  }

  if (request.type === 'TEACH_QUERY') {
    getApiBase().then(apiBase => {
      const pageCtx = request.pageContext || {};
      const contextSnippet = `Webpage Title: "${pageCtx.title || ''}"\nURL: ${pageCtx.url || ''}\nHeadings: ${(pageCtx.headings || []).join(', ')}\nContext: ${pageCtx.textSnippet || ''}`;
      const enrichedMessage = `User question about this page: "${request.message}"\n\nPage Evidence:\n${contextSnippet}`;

      fetch(`${apiBase}/api/teach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: 'general_learning',
          message: enrichedMessage,
          active_concept: pageCtx.title || 'Web Learning',
          mode: 'explain',
          language: 'en'
        }),
      })
        .then(res => res.json())
        .then(data => {
          sendResponse({
            success: true,
            teacherText: data.teacher_text || data.spoken_text || 'I have analyzed the concept on this page.',
            spokenText: data.spoken_text
          });
        })
        .catch(err => {
          sendResponse({
            success: false,
            error: err.message || 'Could not communicate with LEARNOVA backend.'
          });
        });
    });
    return true; // async sendResponse
  }
});

/**
 * LEARNOVA Browser Companion — UI Overlay and Target Beacon Engine
 * Mode B: Browser Companion
 * Principles:
 *  - Guide, Don't Take Over: Visual pointers, never synthetic clicks or password typing
 *  - Explicit Privacy: "Nova is viewing this tab" banner
 *  - Clear Pedagogy: WHAT / WHY / NEXT on every step
 *  - On-Page Chat: Ask conceptual questions about any webpage directly to Professor Nova
 */

(function () {
  if (window.__LEARNOVA_COMPANION_INITIALIZED__) return;
  window.__LEARNOVA_COMPANION_INITIALIZED__ = true;

  let activeBeacon = null;
  let activeStep = null;
  let isCardOpen = false;

  // Root container
  const root = document.createElement('div');
  root.id = 'learnova-companion-root';
  document.body.appendChild(root);

  // Floating Pill
  const pill = document.createElement('div');
  pill.className = 'learnova-pill';
  pill.innerHTML = `
    <div class="learnova-avatar-circle">
      <span class="learnova-avatar-badge">👨‍🏫</span>
    </div>
    <div class="learnova-pill-label">
      <span class="learnova-pill-name">Professor Nova</span>
      <span class="learnova-pill-status">Learning Companion</span>
    </div>
  `;
  root.appendChild(pill);

  // Drawer Card
  const card = document.createElement('div');
  card.className = 'learnova-card';
  card.style.display = 'none';
  card.innerHTML = `
    <div class="learnova-card-header">
      <div class="learnova-card-title">
        <span>👨‍🏫</span>
        <span>Professor Nova</span>
      </div>
      <button class="learnova-card-close" id="ln-close-btn">&times;</button>
    </div>
    <div class="learnova-privacy-banner">
      <span>🛡️</span>
      <span>Nova is viewing this tab (Guide, Don't Take Over)</span>
    </div>
    <div class="learnova-card-body" id="ln-card-body">
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0;">
        I am observing your current webpage to guide your learning journey.
      </p>
      <div id="ln-steps-container"></div>
      <div id="ln-qa-container" style="display: none; margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;">
        <div id="ln-qa-answer" style="font-size: 12px; color: #e2e8f0; line-height: 1.5; white-space: pre-wrap;"></div>
      </div>
    </div>
    <div class="learnova-actions">
      <button class="ln-btn" id="ln-analyze-page-btn">
        <span>🔍</span>
        <span>Analyze This Page</span>
      </button>
      <button class="ln-btn ln-btn-secondary" id="ln-find-tutorial-btn">
        <span>🧭</span>
        <span>Find Next Learning Step</span>
      </button>
    </div>
    <div style="padding: 8px 12px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; gap: 6px; align-items: center;">
      <input type="text" id="ln-tab-question" placeholder="Ask Nova about this page..." style="flex: 1; padding: 7px 10px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 11px; outline: none;" />
      <button id="ln-tab-ask-btn" style="padding: 7px 12px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: 600;">Ask</button>
    </div>
  `;
  root.appendChild(card);

  // Toggle Card Open/Close
  pill.addEventListener('click', () => {
    isCardOpen = !isCardOpen;
    card.style.display = isCardOpen ? 'flex' : 'none';
  });

  card.querySelector('#ln-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    isCardOpen = false;
    card.style.display = 'none';
  });

  // Beacon & Visual Spotlight
  window.LearnovaCompanion = {
    drawBeacon(targetElement, label = 'Study Focus') {
      this.removeBeacon();
      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      const beacon = document.createElement('div');
      beacon.className = 'learnova-spotlight-beacon';
      beacon.style.top = `${rect.top + scrollY - 4}px`;
      beacon.style.left = `${rect.left + scrollX - 4}px`;
      beacon.style.width = `${rect.width + 8}px`;
      beacon.style.height = `${rect.height + 8}px`;

      const badge = document.createElement('div');
      badge.className = 'learnova-beacon-badge';
      badge.innerHTML = `<span>🎯</span> <span>${label}</span>`;
      beacon.appendChild(badge);

      document.body.appendChild(beacon);
      activeBeacon = beacon;

      // Scroll into view smoothly
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    removeBeacon() {
      if (activeBeacon && activeBeacon.parentNode) {
        activeBeacon.parentNode.removeChild(activeBeacon);
      }
      activeBeacon = null;
    },

    setStepGuidance(step) {
      activeStep = step;
      isCardOpen = true;
      card.style.display = 'flex';

      const container = card.querySelector('#ln-steps-container');
      container.innerHTML = `
        <div class="ln-step-box">
          <span class="ln-step-tag ln-tag-what">WHAT TO DO</span>
          <div class="ln-step-text"><strong>${step.what || 'Observe highlighted element.'}</strong></div>
        </div>
        <div class="ln-step-box">
          <span class="ln-step-tag ln-tag-why">WHY LEARN THIS</span>
          <div class="ln-step-text">${step.why || 'This establishes foundational comprehension.'}</div>
        </div>
        <div class="ln-step-box">
          <span class="ln-step-tag ln-tag-next">NEXT STEP</span>
          <div class="ln-step-text">${step.next || 'We will examine the resulting material together.'}</div>
        </div>
      `;

      if (step.targetSelector) {
        const el = document.querySelector(step.targetSelector);
        if (el) {
          this.drawBeacon(el, step.badgeLabel || 'Target Action');
          this.watchLearnerAction(el, step);
        }
      }
    },

    watchLearnerAction(element, step) {
      const handler = () => {
        this.removeBeacon();
        const container = card.querySelector('#ln-steps-container');
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'padding: 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; color: #34d399; font-size: 12px; margin-top: 8px;';
        successMsg.innerHTML = '✅ <strong>Action Verified!</strong> Professor Nova is analyzing the result...';
        container.appendChild(successMsg);

        element.removeEventListener('click', handler);
        element.removeEventListener('keydown', handler);

        // Notify background worker
        chrome.runtime?.sendMessage?.({
          type: 'STEP_VERIFIED',
          stepId: step.id,
          url: window.location.href,
        });
      };

      element.addEventListener('click', handler, { once: true });
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handler();
      }, { once: true });
    },
  };

  // Button actions
  card.querySelector('#ln-analyze-page-btn').addEventListener('click', () => {
    window.postMessage({ type: 'LEARNOVA_TRIGGER_PAGE_ANALYSIS' }, '*');
  });

  card.querySelector('#ln-find-tutorial-btn').addEventListener('click', () => {
    window.postMessage({ type: 'LEARNOVA_TRIGGER_FIND_TUTORIAL' }, '*');
  });

  // On-Page Question Handler
  const askInput = card.querySelector('#ln-tab-question');
  const askBtn = card.querySelector('#ln-tab-ask-btn');
  const qaContainer = card.querySelector('#ln-qa-container');
  const qaAnswer = card.querySelector('#ln-qa-answer');

  async function handleTabAsk() {
    const q = askInput.value.trim();
    if (!q) return;

    askBtn.disabled = true;
    askBtn.textContent = '...';
    qaContainer.style.display = 'block';
    qaAnswer.textContent = 'Thinking...';

    // Extract quick context
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 6)
      .map(h => h.textContent.trim())
      .filter(Boolean);
    const paragraphs = Array.from(document.querySelectorAll('p, article, main'))
      .slice(0, 4)
      .map(p => p.textContent.trim())
      .filter(t => t.length > 30)
      .join('\n');

    chrome.runtime?.sendMessage?.(
      {
        type: 'TEACH_QUERY',
        message: q,
        pageContext: {
          title: document.title,
          url: window.location.href,
          headings,
          textSnippet: paragraphs.slice(0, 1000),
        },
      },
      (res) => {
        askBtn.disabled = false;
        askBtn.textContent = 'Ask';
        if (res?.success) {
          qaAnswer.textContent = res.teacherText;
        } else {
          qaAnswer.textContent = res?.error || 'Unable to get answer from LEARNOVA backend.';
        }
      }
    );
  }

  askBtn.addEventListener('click', handleTabAsk);
  askInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleTabAsk();
  });
})();

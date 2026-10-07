/**
 * LEARNOVA Browser Companion — UI Overlay and Target Beacon Engine
 * Mode B: Browser Companion
 * Principles:
 *  - Guide, Don't Take Over: Visual pointers, never synthetic clicks or password typing
 *  - Explicit Privacy: "Nova is viewing this tab" banner
 *  - Clear Pedagogy: WHAT / WHY / NEXT on every step
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
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 12px 0;">
        I am observing your current webpage to guide your learning journey.
      </p>
      <div id="ln-steps-container"></div>
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

      // Scroll into view if needed
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
        // Learner executed action!
        this.removeBeacon();
        const container = card.querySelector('#ln-steps-container');
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'padding: 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; color: #34d399; font-size: 12px; margin-top: 8px;';
        successMsg.innerHTML = '✅ <strong>Action Verified!</strong> Professor Nova is analyzing the result...';
        container.appendChild(successMsg);

        element.removeEventListener('click', handler);
        element.removeEventListener('keydown', handler);

        // Notify background
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
})();

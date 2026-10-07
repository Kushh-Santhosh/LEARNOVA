# LEARNOVA Universal Browser Learning Companion

> **Mode B: Browser Learning Companion**  
> Extension Architecture: **Manifest V3**  
> Compatibility: Chrome, Edge, Brave, Chromium-based browsers.

---

## 1. Overview
The **LEARNOVA Universal Browser Learning Companion** brings Professor Nova to any webpage you browse (Google Search, Wikipedia, MDN, Python Docs, GitHub, research papers, etc.).

Unlike traditional chatbots or web-scraping agents:
- **Guide, Don't Take Over**: Nova uses visual spotlights, focus beacons, and step-by-step guidance cards (WHAT / WHY / NEXT). Nova **never** silently takes control, submits forms, types passwords, or performs irreversible actions.
- **Privacy First**: Always displays the *"Nova is viewing this tab"* banner. No screen buffers or video frames are persisted.
- **Academic Grounding**: Directs learners to authoritative documentation (e.g. `docs.python.org`, `developer.mozilla.org`) rather than low-quality content aggregators.

---

## 2. Directory Structure
```
browser-extension/
├── manifest.json         # Manifest V3 configuration & permissions
├── src/
│   ├── background.js     # Background service worker (bridges tab with port 8000)
│   ├── content.js        # DOM understanding & page analyzer
│   ├── companion.js      # Floating Nova widget & spotlight beacon engine
│   ├── companion.css     # Glassmorphic overlay styling & beacon animations
│   ├── popup.html        # Extension popup interface
│   └── popup.js          # Popup action handlers
└── README.md             # Architecture & installation guide
```

---

## 3. How to Install & Test (Developer Mode)
1. Open Google Chrome (or any Chromium browser) and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `LEARNOVA/browser-extension` folder.
5. The **LEARNOVA — Professor Nova Browser Companion** will appear in your extension toolbar.

---

## 4. Example User Flow
1. Navigate to `https://www.google.com`.
2. Click the Professor Nova extension or floating pill on the page.
3. Ask: *"Teach me Python."*
4. Nova identifies you are on Google Search, draws a beacon over the search input, and provides step instruction:
   - **WHAT**: Type `Python official tutorial` into the search box.
   - **WHY**: Learning begins with official documentation rather than unverified blog posts.
   - **NEXT**: Press Enter to view search results.
5. When the user executes the search, Nova detects the new page and points directly to `docs.python.org`.

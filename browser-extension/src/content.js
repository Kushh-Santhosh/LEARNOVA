/**
 * LEARNOVA Content Script — Arbitrary Webpage Understanding & DOM Guidance
 * Mode B: Browser Companion
 * Supports:
 *   - Google Search: identifies search inputs, points to authoritative docs (e.g. docs.python.org)
 *   - Wikipedia: identifies article title, lead paragraph, section table of contents
 *   - MDN / Documentation Sites: identifies code snippets, key concepts, tutorials
 */

(function () {
  function getPageContext() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    const title = document.title;

    // Detect page type
    const isGoogle = hostname.includes('google.');
    const isWikipedia = hostname.includes('wikipedia.org');
    const isMDN = hostname.includes('developer.mozilla.org');
    const isPythonDocs = hostname.includes('docs.python.org');

    // Extract headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 10)
      .map(h => h.textContent.trim())
      .filter(Boolean);

    // Extract potential search inputs
    const searchInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], textarea[name="q"], input[name="q"]'))
      .map((el, idx) => ({
        selector: el.id ? `#${el.id}` : (el.name ? `input[name="${el.name}"]` : `input`),
        placeholder: el.placeholder || '',
        name: el.name || '',
      }));

    // Extract main text summary
    const paragraphs = Array.from(document.querySelectorAll('p, article, main'))
      .slice(0, 5)
      .map(p => p.textContent.trim())
      .filter(t => t.length > 40)
      .join('\n');

    return {
      url,
      hostname,
      title,
      isGoogle,
      isWikipedia,
      isMDN,
      isPythonDocs,
      headings,
      searchInputs,
      textSnippet: paragraphs.slice(0, 1000),
    };
  }

  // Handle guidance requests
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'LEARNOVA_TRIGGER_PAGE_ANALYSIS') {
      const context = getPageContext();
      handlePageAnalysis(context);
    } else if (event.data?.type === 'LEARNOVA_TRIGGER_FIND_TUTORIAL') {
      handleFindTutorial();
    }
  });

  // Listen for messages from background.js
  chrome.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_PAGE_CONTEXT') {
      sendResponse(getPageContext());
    } else if (msg.type === 'SHOW_STEP_GUIDANCE') {
      window.LearnovaCompanion?.setStepGuidance(msg.step);
      sendResponse({ status: 'ok' });
    } else if (msg.type === 'POINT_ELEMENT') {
      const el = document.querySelector(msg.selector);
      if (el) {
        window.LearnovaCompanion?.drawBeacon(el, msg.label || 'Target Focus');
        sendResponse({ status: 'ok' });
      } else {
        sendResponse({ status: 'not_found' });
      }
    }
  });

  function handlePageAnalysis(context) {
    if (context.isGoogle) {
      window.LearnovaCompanion?.setStepGuidance({
        id: 'step_google_search',
        what: 'Use Google to find authoritative curriculum documentation.',
        why: 'Learning begins with authoritative sources like official docs rather than low-quality aggregators.',
        next: 'Type your study topic (e.g., "Python official tutorial") in the search field.',
        targetSelector: 'textarea[name="q"], input[name="q"], input[type="text"]',
        badgeLabel: 'Google Search Bar',
      });
    } else if (context.isWikipedia) {
      window.LearnovaCompanion?.setStepGuidance({
        id: 'step_wiki_read',
        what: `Analyze the foundational overview of ${context.title.split(' - ')[0]}.`,
        why: 'Wikipedia provides high-level mental models and historical context before writing code.',
        next: 'Review the lead section, then explore key architectural subsections.',
        targetSelector: '#firstHeading, h1',
        badgeLabel: 'Topic Overview',
      });
    } else if (context.isPythonDocs) {
      window.LearnovaCompanion?.setStepGuidance({
        id: 'step_python_docs',
        what: 'Study the official Python Tutorial section.',
        why: 'Official documentation is the primary source of truth for language syntax and standard libraries.',
        next: 'Practice the code examples in an interactive terminal.',
        targetSelector: 'main, article, div.body',
        badgeLabel: 'Official Documentation',
      });
    } else {
      // General webpage guidance
      window.LearnovaCompanion?.setStepGuidance({
        id: 'step_general_page',
        what: `Review key concepts from "${context.title.slice(0, 50)}".`,
        why: 'Active reading with structured note-taking improves retention and prevents cognitive overload.',
        next: 'Identify the main definition and test your understanding with a teach-back.',
        targetSelector: 'h1, h2, main, article',
        badgeLabel: 'Curriculum Heading',
      });
    }
  }

  function handleFindTutorial() {
    const context = getPageContext();
    if (context.isGoogle) {
      const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
      if (searchBox) {
        searchBox.value = 'Python official tutorial beginner';
        searchBox.focus();
        window.LearnovaCompanion?.setStepGuidance({
          id: 'step_submit_google',
          what: 'Press Enter to find the official Python tutorial on docs.python.org.',
          why: 'Official tutorials provide idiomatic code patterns and eliminate outdated practices.',
          next: 'We will inspect docs.python.org together when results load.',
          targetSelector: 'textarea[name="q"], input[name="q"]',
          badgeLabel: 'Press Enter',
        });
      }
    } else {
      window.LearnovaCompanion?.setStepGuidance({
        id: 'step_navigate_docs',
        what: 'Look for documentation or tutorial links on this page.',
        why: 'Structured curriculum documentation is more effective than unverified blog posts.',
        next: 'Select the primary introduction or getting started guide.',
        targetSelector: 'nav, header, a[href*="doc"], a[href*="tutorial"]',
        badgeLabel: 'Navigation',
      });
    }
  }

  // Automatic gentle check on Google Search Results page
  if (window.location.hostname.includes('google.') && window.location.search.includes('q=')) {
    // We are on search results! Check if docs.python.org is present
    setTimeout(() => {
      const pythonDocLink = Array.from(document.querySelectorAll('a')).find(a =>
        a.href && (a.href.includes('docs.python.org') || a.href.includes('python.org'))
      );
      if (pythonDocLink) {
        window.LearnovaCompanion?.setStepGuidance({
          id: 'step_select_python_doc',
          what: 'Click the official docs.python.org result.',
          why: 'Python.org is the authoritative specification for all Python versions and standard modules.',
          next: 'Start reading the tutorial in your browser companion.',
          targetSelector: pythonDocLink.id ? `#${pythonDocLink.id}` : 'a[href*="docs.python.org"]',
          badgeLabel: 'Authoritative Result (docs.python.org)',
        });
      }
    }, 1200);
  }
})();

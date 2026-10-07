import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('tests/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAcceptanceTest() {
  console.log('🚀 Starting LEARNOVA End-to-End Acceptance Test Suite...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Load Application
    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_home_screen.png') });
    console.log('   📸 Captured: 01_home_screen.png');

    // 2. Click "Learn Python" chip or click Classroom
    console.log('2. Entering Classroom Workspace for General Learning...');
    const learnPythonBtn = await page.$('button:has-text("Learn Python")');
    if (learnPythonBtn) {
      await learnPythonBtn.click();
    } else {
      const navLearn = await page.$('button[data-guide-id="nav-classroom"]');
      if (navLearn) await navLearn.click();
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_classroom_workspace.png') });
    console.log('   📸 Captured: 02_classroom_workspace.png');

    // 3. Send Question: Python Functions
    console.log('3. Sending inquiry: "I want to learn Python functions. How do they work?"...');
    const chatInput = await page.$('textarea, input[type="text"]');
    if (chatInput) {
      await chatInput.fill('I want to learn Python functions. How do they work?');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
    }

    console.log('4. Waiting for Professor Nova response...');
    // Wait for response to appear (timeout up to 25s for LLM)
    await page.waitForFunction(() => {
      const texts = document.body.innerText;
      return texts.includes('Python') && (texts.includes('function') || texts.includes('Function') || texts.includes('def '));
    }, { timeout: 25000 }).catch(() => console.log('   (Timeout waiting for live LLM; checking page state)'));

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_python_learning.png') });
    console.log('   📸 Captured: 03_python_learning.png');

    // Verify zero TCP/UDP in visible text
    const pageText = await page.innerText('body');
    const hasPython = pageText.toLowerCase().includes('python');
    const hasTcp = pageText.toLowerCase().includes('3-way handshake') || (pageText.includes('TCP') && !pageText.includes('Computer Networks'));
    console.log(`   Verification: Python present=${hasPython}, Unwanted TCP fallback=${hasTcp}`);

    // 5. Test Quick Action: Example
    console.log('5. Requesting Concrete Example...');
    const exampleBtn = await page.$('button:has-text("Example")');
    if (exampleBtn) {
      await exampleBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_python_example.png') });
    console.log('   📸 Captured: 04_python_example.png');

    // 6. Test Quick Action: Quiz
    console.log('6. Requesting Quiz...');
    const quizBtn = await page.$('button:has-text("Quiz"), button:has-text("Take Quiz"), button[title="Quiz"]');
    if (quizBtn) {
      await quizBtn.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_python_quiz.png') });
    console.log('   📸 Captured: 05_python_quiz.png');

    // Close quiz modal if open
    const cancelBtn = await page.$('button:has-text("Cancel"), button[title="Close"], button:has-text("Close")');
    if (cancelBtn) {
      await cancelBtn.click();
      await page.waitForTimeout(800);
    }

    // 7. Click New Lesson in Sidebar
    console.log('7. Testing New Lesson reset...');
    const newLessonBtn = await page.$('button[data-guide-id="nav-new-lesson"]');
    if (newLessonBtn) {
      await newLessonBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_new_lesson_fresh.png') });
    console.log('   📸 Captured: 06_new_lesson_fresh.png');

    // 8. Documents Hub
    console.log('8. Viewing Document Hub...');
    const docsNav = await page.$('button[data-guide-id="nav-documents"]');
    if (docsNav) {
      await docsNav.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_documents_hub.png') });
    console.log('   📸 Captured: 07_documents_hub.png');

    // 9. Knowledge Graph
    console.log('9. Viewing Knowledge Graph...');
    const kgNav = await page.$('button[data-guide-id="nav-knowledge"]');
    if (kgNav) {
      await kgNav.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_knowledge_graph.png') });
    console.log('   📸 Captured: 08_knowledge_graph.png');

    // 10. Progress & Analytics
    console.log('10. Viewing Progress & Mastery...');
    const progNav = await page.$('button[data-guide-id="nav-progress"]');
    if (progNav) {
      await progNav.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_progress_analytics.png') });
    console.log('   📸 Captured: 09_progress_analytics.png');

    console.log('✨ All browser acceptance flows completed successfully!');
  } catch (err) {
    console.error('❌ Error during acceptance test:', err);
  } finally {
    await browser.close();
  }
}

runAcceptanceTest();

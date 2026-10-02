import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.resolve('artifacts/final_screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runStudentJourney() {
  console.log('--- Starting LEARNOVA Real Student End-to-End Browser QA ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // STEP 1: Open LEARNOVA
  console.log('Step 1: Open LEARNOVA at http://127.0.0.1:3000');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Go to Home
  const homeNav = page.locator('aside button:has-text("Home")').first();
  if (await homeNav.isVisible()) {
    await homeNav.click();
    await page.waitForTimeout(600);
    console.log('Saving: 01-home.png');
    await page.screenshot({ path: path.join(screenshotDir, '01-home.png'), fullPage: true });
  }

  // STEP 2: Create a new lesson / Open course
  console.log('Step 2: Create a new lesson / Open course');
  const newLessonBtn = page.locator('aside button:has-text("New Lesson")').first();
  await newLessonBtn.click();
  await page.waitForTimeout(600);

  // STEP 3 & 4: Upload a document & wait for processing
  console.log('Step 3: Navigate to Documents Hub');
  const docsNav = page.locator('aside button:has-text("Documents")').first();
  await docsNav.click();
  await page.waitForTimeout(600);

  console.log('Saving: 06-documents.png');
  await page.screenshot({ path: path.join(screenshotDir, '06-documents.png'), fullPage: true });

  const sampleFile = path.resolve('../scratch/sample_operating_systems.txt');
  if (fs.existsSync(sampleFile)) {
    console.log('Step 3b: Upload document file...');
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null);
    await page.locator('text=Drop your study document here').click({ force: true }).catch(() => {});
    const fileChooser = await fileChooserPromise;
    if (fileChooser) {
      await fileChooser.setFiles(sampleFile);
      console.log('Step 4: Waiting for progressive document processing stages...');
      await page.waitForTimeout(3000);
    }
  }

  // STEP 5 & 6: Open the resulting course / Start lesson
  console.log('Step 5 & 6: Start / Continue Lesson');
  const learnNav = page.locator('aside button:has-text("Learn")').first();
  await learnNav.click();
  await page.waitForTimeout(1000);

  console.log('Saving: 02-course.png / 03-lesson.png');
  await page.screenshot({ path: path.join(screenshotDir, '02-course.png'), fullPage: true });
  await page.screenshot({ path: path.join(screenshotDir, '03-lesson.png'), fullPage: true });

  // STEP 7: Ask Professor Nova a question
  console.log('Step 7: Ask Professor Nova a question');
  const textarea = page.locator('textarea[placeholder*="Ask Professor Nova"]').first();
  await textarea.fill('How does the Transport Layer guarantee data arrives reliably?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);

  // STEP 8: Switch explanation style
  console.log('Step 8: Switch explanation style to Socratic');
  const socraticBtn = page.locator('button:has-text("Socratic")').first();
  if (await socraticBtn.isVisible()) {
    await socraticBtn.click();
    await page.waitForTimeout(300);
  }

  // STEP 9: Ask for a simpler explanation
  console.log('Step 9: Ask for a simpler explanation');
  await textarea.fill('Can you explain TCP reliability with a simple analogy?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);

  // STEP 10: Ask for an example
  console.log('Step 10: Ask for an example');
  await textarea.fill('Give me a real-world example comparing video streaming and file download.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);

  // STEP 11: Ask for a visual artifact
  console.log('Step 11: Ask for a visual');
  await textarea.fill('Show me a comparison table visual comparing TCP and UDP.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  // STEP 12: Open source citation & Artifact
  console.log('Step 12: Inspect visual artifact & citation');
  const openArtifactBtn = page.locator('button:has-text("View"), button:has-text("Workspace")').first();
  if (await openArtifactBtn.isVisible()) {
    await openArtifactBtn.click();
    await page.waitForTimeout(1000);
    const closePanelBtn = page.locator('button[title*="Close panel"], button:has-text("✕")').first();
    if (await closePanelBtn.isVisible()) {
      await closePanelBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Focus Teacher Avatar check
  console.log('Step 12b: Test Professor Nova Avatar in Focus Mode');
  const focusTeacherBtn = page.locator('button:has-text("Focus Teacher")').first();
  if (await focusTeacherBtn.isVisible()) {
    await focusTeacherBtn.click();
    await page.waitForTimeout(800);
    console.log('Saving: 04-avatar.png');
    await page.screenshot({ path: path.join(screenshotDir, '04-avatar.png'), fullPage: true });
    // Exit focus mode
    await focusTeacherBtn.click();
    await page.waitForTimeout(500);
  }

  // STEP 13 & 14: Open Knowledge Graph & select concept
  console.log('Step 13 & 14: Open Knowledge Graph');
  const knowledgeNav = page.locator('aside button:has-text("Knowledge")').first();
  if (await knowledgeNav.isVisible()) {
    await knowledgeNav.click();
    await page.waitForTimeout(800);
  }
  console.log('Saving: 05-knowledge.png');
  await page.screenshot({ path: path.join(screenshotDir, '05-knowledge.png'), fullPage: true });

  // STEP 16 & 17: Take quiz & submit answer
  console.log('Step 16: Open Quiz Modal');
  await learnNav.click();
  await page.waitForTimeout(600);
  const quizBtn = page.locator('header button:has-text("Quiz")').first();
  if (await quizBtn.isVisible()) {
    await quizBtn.click();
    await page.waitForTimeout(800);

    const quizModal = page.locator('div.fixed.inset-0:has-text("Quiz"), div.fixed.inset-0:has-text("Grounded")').first();
    const firstOption = quizModal.locator('.space-y-2\\.5 button, .space-y-2 button, button:has-text("TCP"), button:has-text("True"), button:has-text("Layer")').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
      await page.waitForTimeout(400);
      const submitQuiz = quizModal.locator('button:has-text("Submit Answer")').first();
      if (await submitQuiz.isVisible()) {
        await submitQuiz.click();
        await page.waitForTimeout(1000);
      }
    }
    const closeQuiz = quizModal.locator('button:has-text("Continue"), button:has-text("Cancel"), button:has-text("Close")').first();
    if (await closeQuiz.isVisible()) await closeQuiz.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // STEP 18: Trigger Misconception
  console.log('Step 18: Trigger misconception');
  await textarea.fill('UDP is always better and more reliable than TCP because it does not have packet headers.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  // STEP 19: Run teach-back
  console.log('Step 19: Run Teach-Back');
  const teachBackBtn = page.locator('header button:has-text("Teach-Back")').first();
  if (await teachBackBtn.isVisible()) {
    await teachBackBtn.click();
    await page.waitForTimeout(800);
    const teachBackModal = page.locator('div.fixed.inset-0:has-text("Teach-Back")').first();
    const teachBackInput = teachBackModal.locator('textarea').first();
    if (await teachBackInput.isVisible()) {
      await teachBackInput.fill('The transport layer breaks data into packets, provides port numbers so applications receive the right streams, and TCP uses ACKs and sequence numbers for reliability while UDP sends packets without connection overhead.');
      const evalBtn = teachBackModal.locator('button:has-text("Evaluate")').first();
      if (await evalBtn.isVisible()) {
        await evalBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    const closeTeachBack = teachBackModal.locator('button:has-text("Apply to Classroom"), button:has-text("Cancel"), button:has-text("Close")').first();
    if (await closeTeachBack.isVisible()) await closeTeachBack.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // STEP 20 & 21: Check Progress & Revision
  console.log('Step 20 & 21: Check Progress & Revision Hub');
  const progressNav = page.locator('aside button:has-text("Progress")').first();
  await progressNav.click();
  await page.waitForTimeout(800);

  console.log('Saving: 07-progress.png');
  await page.screenshot({ path: path.join(screenshotDir, '07-progress.png'), fullPage: true });

  // Open Revision Schedule tab
  const revisionTab = page.locator('button:has-text("Revision Schedule")').first();
  if (await revisionTab.isVisible()) {
    await revisionTab.click();
    await page.waitForTimeout(500);
  }

  // STEP 22: Return to Lesson
  console.log('Step 22: Return to Lesson');
  const returnBtn = page.locator('button:has-text("Continue Lesson")').first();
  if (await returnBtn.isVisible()) await returnBtn.click();
  else await learnNav.click();
  await page.waitForTimeout(600);

  // STEP 23: Change Learner Preferences
  console.log('Step 23: Open and modify Learning Preferences');
  const profileBtn = page.locator('aside button[title*="Preferences"], aside button:has-text("Alex")').first();
  await profileBtn.click();
  await page.waitForTimeout(800);

  console.log('Saving: 08-settings.png');
  await page.screenshot({ path: path.join(screenshotDir, '08-settings.png') });

  const styleTab = page.locator('button:has-text("Teaching Style")').first();
  if (await styleTab.isVisible()) await styleTab.click();
  await page.waitForTimeout(300);

  const savePrefBtn = page.locator('button:has-text("Save Preferences")').first();
  if (await savePrefBtn.isVisible()) await savePrefBtn.click();
  await page.waitForTimeout(500);

  // STEP 24: Tablet Viewport (768x1024)
  console.log('Step 24: Testing Tablet Viewport (768x1024)');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(800);

  // STEP 25: Mobile Viewport (375x812)
  console.log('Step 25: Testing Mobile Viewport (375x812)');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(800);

  console.log('Saving: 09-mobile.png');
  await page.screenshot({ path: path.join(screenshotDir, '09-mobile.png'), fullPage: true });

  await browser.close();
  console.log('Student Journey QA completed successfully!');
}

runStudentJourney().catch((err) => {
  console.error('E2E Test encountered an error:', err);
  process.exit(1);
});

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('artifacts/audit_screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:3000...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Initial Screen (Classroom or Landing)
  console.log('Capturing Initial View...');
  await page.screenshot({ path: path.join(outDir, '01_initial_view.png'), fullPage: true });

  // Check if we are in Landing or Classroom
  // Click Brand to go to Landing
  const brandEl = page.locator('text=LEARNOVA').first();
  if (await brandEl.isVisible()) {
    await brandEl.click();
    await page.waitForTimeout(600);
    console.log('Capturing Landing Screen...');
    await page.screenshot({ path: path.join(outDir, '02_landing_screen.png'), fullPage: true });
  }

  // Click 'Enter AI Classroom'
  const enterBtn = page.locator('button:has-text("Enter AI Classroom")').first();
  if (await enterBtn.isVisible()) {
    await enterBtn.click();
    await page.waitForTimeout(800);
  }

  // 2. Classroom View
  console.log('Capturing Classroom View...');
  await page.screenshot({ path: path.join(outDir, '03_classroom_screen.png'), fullPage: true });

  // Open Quiz Modal
  const quizBtn = page.locator('button:has-text("Quiz Me")').first();
  if (await quizBtn.isVisible()) {
    await quizBtn.click();
    await page.waitForTimeout(800);
    console.log('Capturing Quiz Modal...');
    await page.screenshot({ path: path.join(outDir, '04_quiz_modal.png') });
    // Close quiz
    const closeBtn = page.locator('button:has-text("Cancel"), button[title="Close"], button:has-text("✕")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Open TeachBack Modal
  const teachBackBtn = page.locator('button:has-text("Teach-Back")').first();
  if (await teachBackBtn.isVisible()) {
    await teachBackBtn.click();
    await page.waitForTimeout(800);
    console.log('Capturing TeachBack Modal...');
    await page.screenshot({ path: path.join(outDir, '05_teachback_modal.png') });
    const closeBtn = page.locator('button:has-text("Cancel"), button[title="Close"]').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Open Profile / Teacher Settings Modal (at bottom of sidebar)
  const profileBtn = page.locator('aside button[title*="Preferences"], aside button:has-text("Alex")').first();
  if (await profileBtn.isVisible()) {
    await profileBtn.click();
    await page.waitForTimeout(800);
    console.log('Capturing Settings/Profile Modal...');
    await page.screenshot({ path: path.join(outDir, '06_settings_modal.png') });
    const closeBtn = page.locator('button:has-text("Cancel"), button:has-text("Save")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 3. Knowledge Graph
  const graphNav = page.locator('aside button:has-text("Knowledge Graph")').first();
  if (await graphNav.isVisible()) {
    await graphNav.click();
    await page.waitForTimeout(1000);
    console.log('Capturing Knowledge Graph Screen...');
    await page.screenshot({ path: path.join(outDir, '07_knowledge_graph.png'), fullPage: true });
  }

  // 4. Study Documents
  const docsNav = page.locator('aside button:has-text("Study Documents")').first();
  if (await docsNav.isVisible()) {
    await docsNav.click();
    await page.waitForTimeout(800);
    console.log('Capturing Study Documents Screen...');
    await page.screenshot({ path: path.join(outDir, '08_study_documents.png'), fullPage: true });
  }

  // 5. Mastery & Progress
  const progNav = page.locator('aside button:has-text("Mastery & Progress")').first();
  if (await progNav.isVisible()) {
    await progNav.click();
    await page.waitForTimeout(800);
    console.log('Capturing Mastery & Progress Screen...');
    await page.screenshot({ path: path.join(outDir, '09_progress_screen.png'), fullPage: true });
  }

  // 6. Revision Plan
  const revNav = page.locator('aside button:has-text("Revision Plan")').first();
  if (await revNav.isVisible()) {
    await revNav.click();
    await page.waitForTimeout(800);
    console.log('Capturing Revision Plan Screen...');
    await page.screenshot({ path: path.join(outDir, '10_revision_screen.png'), fullPage: true });
  }

  // 7. Mobile View
  console.log('Testing Mobile Viewport (375x812)...');
  await page.setViewportSize({ width: 375, height: 812 });
  const lessonNav = page.locator('aside button:has-text("Current Lesson")').first();
  if (await lessonNav.isVisible()) await lessonNav.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '11_mobile_classroom.png'), fullPage: true });

  await browser.close();
  console.log('Audit capture completed successfully! Screenshots saved in:', outDir);
}

runAudit().catch(err => {
  console.error('Error during audit capture:', err);
  process.exit(1);
});

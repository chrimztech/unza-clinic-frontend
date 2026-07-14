import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5180/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'scratch-login.png' });
await browser.close();

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Log requests
  page.on('redirect', (req, res) => console.log('REDIRECT:', req.url(), '->', res.url()));

  await page.goto('https://dormtohome.onrender.com', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  
  // Check what's actually in head
  const head = await page.evaluate(() => document.head.innerHTML);
  console.log('Head length:', head.length);
  console.log('Head:', head);
  
  await browser.close();
})();
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.test.js >> DormToHome E2E Tests >> Test 10: Driver login and all driver features
- Location: tests/e2e.test.js:497:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#simulate-section')
Expected: visible
Received: hidden
Timeout:  3000ms

Call log:
  - Expect "toBeVisible" with timeout 3000ms
  - waiting for locator('#simulate-section')
    7 × locator resolved to <div id="simulate-section">…</div>
      - unexpected value "hidden"

```

```yaml
- banner:
  - img
  - text: DormToHome
  - navigation: Dashboard My Routes New Route Check-In Live Requests Messages
  - text: Live
  - button:
    - img
  - text: MD
- text: Live Tracking DTH-210
- heading "Live Tracking" [level=3]
- paragraph: Share your real-time location with passengers on this route.
- button "▶ Go Live"
- text: Not broadcasting
```

# Test source

```ts
  491 |     // Confirm dialog is auto-accepted by the handler
  492 |     await expect(page.locator('#screen-landing')).toBeVisible({ timeout: 5000 });
  493 |   });
  494 | 
  495 |   // ─── TEST 10: DRIVER LOGIN AND DASHBOARD ──────────────
  496 | 
  497 |   test('Test 10: Driver login and all driver features', async () => {
  498 |     // Navigate from landing to login
  499 |     await page.locator('#screen-landing button', { hasText: 'Sign In' }).click();
  500 |     await expect(page.locator('#screen-login')).toBeVisible({ timeout: 5000 });
  501 | 
  502 |     // Sign in as driver
  503 |     await page.fill('#login-email', 'marcus@dormtohome.com');
  504 |     await page.fill('#login-pass', 'password123');
  505 |     await page.locator('#login-btn').click();
  506 |     await expect(page.locator('#screen-driver')).toBeVisible({ timeout: 12000 });
  507 | 
  508 |     const driver = page.locator('#screen-driver');
  509 | 
  510 |     // Driver dashboard with analytics
  511 |     await expect(driver.getByText('Driver Dashboard')).toBeVisible({ timeout: 10000 });
  512 |     await expect(driver.locator('.nav-item', { hasText: 'My Routes' })).toBeVisible({ timeout: 5000 });
  513 |     await expect(driver.getByText('Total Passengers')).toBeVisible({ timeout: 5000 });
  514 |     await expect(driver.getByText('Upcoming Trips')).toBeVisible({ timeout: 5000 });
  515 |     await expect(driver.locator('.section-title', { hasText: 'Location Sharing' })).toBeVisible({ timeout: 5000 });
  516 | 
  517 |     // My Routes
  518 |     await driver.locator('[data-tab="routes"]').click();
  519 |     await waitForSpinner();
  520 |     await expect(driver.locator('.page-title', { hasText: 'My Routes' })).toBeVisible({ timeout: 5000 });
  521 |     const hasDriverRoutes = await driver.locator('.route-card').first().isVisible().catch(() => false);
  522 |     if (hasDriverRoutes) {
  523 |       await expect(driver.locator('.route-card').first()).toBeVisible({ timeout: 5000 });
  524 |     }
  525 | 
  526 |     // New Route creation wizard
  527 |     await driver.locator('[data-tab="create"]').click();
  528 |     await expect(driver.getByText('Create New Route')).toBeVisible({ timeout: 5000 });
  529 |     await expect(driver.getByText('Route Information')).toBeVisible({ timeout: 3000 });
  530 | 
  531 |     // Step 1: Route Info
  532 |     await page.fill('#cr-from', 'College Station, TX');
  533 |     await page.fill('#cr-to', 'Dallas, TX');
  534 |     await page.fill('#cr-date', '2026-08-01');
  535 |     await page.fill('#cr-dep-time', '08:00');
  536 |     await page.fill('#cr-duration', '3h 30m');
  537 |     await driver.locator('button', { hasText: 'Next: Stops' }).click();
  538 | 
  539 |     // Step 2: Stops & Checkpoints
  540 |     await expect(driver.getByText('Stops & Checkpoints')).toBeVisible({ timeout: 3000 });
  541 |     await driver.locator('button', { hasText: 'Next: Seats' }).click();
  542 | 
  543 |     // Step 3: Seats & Pricing
  544 |     await expect(driver.getByText('Seats & Pricing')).toBeVisible({ timeout: 3000 });
  545 |     await page.fill('#cr-price', '35');
  546 |     await driver.locator('button', { hasText: 'Review' }).click();
  547 | 
  548 |     // Step 4: Review & Post
  549 |     await expect(driver.getByText('Review & Post')).toBeVisible({ timeout: 3000 });
  550 |     await expect(driver.getByText('Route Preview')).toBeVisible({ timeout: 3000 });
  551 | 
  552 |     // Cancel — don't post a real route
  553 |     await driver.locator('button', { hasText: '← Edit' }).click();
  554 |     await expect(driver.getByText('Seats & Pricing')).toBeVisible({ timeout: 3000 });
  555 |     await driver.locator('[data-tab="routes"]').click();
  556 |     await waitForSpinner();
  557 | 
  558 |     // Requests tab
  559 |     await driver.locator('[data-tab="requested"]').click();
  560 |     await waitForSpinner();
  561 |     await expect(driver.getByText('Passenger Requests')).toBeVisible({ timeout: 5000 });
  562 |     const hasRequests = await driver.locator('.card-sm').first().isVisible().catch(() => false);
  563 |     if (hasRequests) {
  564 |       await expect(driver.locator('.card-sm').first()).toBeVisible({ timeout: 5000 });
  565 |     }
  566 | 
  567 |     // Messages tab (driver)
  568 |     await driver.locator('[data-tab="messages"]').click();
  569 |     await waitForSpinner();
  570 |     const driverChat = driver.locator('.chat-sidebar');
  571 |     if (await driverChat.isVisible({ timeout: 5000 }).catch(() => false)) {
  572 |       await expect(driver.locator('.chat-room-item').first()).toBeVisible({ timeout: 5000 });
  573 |       const driverInput = driver.locator('#chat-input');
  574 |       if (await driverInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  575 |         await driverInput.fill(`Driver test message ${Date.now()}`);
  576 |         await driver.locator('button', { hasText: 'Send' }).click();
  577 |         await page.waitForTimeout(1500);
  578 |         const lastMsg = driver.locator('.chat-msg').last();
  579 |         await expect(lastMsg).toContainText('Driver test message', { timeout: 5000 });
  580 |       }
  581 |     }
  582 | 
  583 |     // Live tab — Simulate Checkpoint section appears when live
  584 |     await driver.locator('[data-tab="live"]').click();
  585 |     await waitForSpinner();
  586 |     await expect(driver.getByText('Live Tracking')).toBeVisible({ timeout: 5000 });
  587 |     await page.evaluate(() => {
  588 |       isLiveBroadcasting = true;
  589 |       updateLiveBtnState(true);
  590 |     });
> 591 |     await expect(page.locator('#simulate-section')).toBeVisible({ timeout: 3000 });
      |                                                     ^ Error: expect(locator).toBeVisible() failed
  592 |     await expect(driver.getByText('Test / Simulate Checkpoint')).toBeVisible({ timeout: 3000 });
  593 |     await page.evaluate(() => {
  594 |       isLiveBroadcasting = false;
  595 |       updateLiveBtnState(false);
  596 |     });
  597 |     await expect(page.locator('#simulate-section')).not.toBeVisible({ timeout: 3000 });
  598 | 
  599 |     // Sign out from driver account
  600 |     await driver.locator('[data-tab="dashboard"]').click();
  601 |     await waitForSpinner();
  602 |     const signOutBtns = driver.locator('button', { hasText: 'Sign Out' });
  603 |     const count = await signOutBtns.count();
  604 |     if (count > 0) {
  605 |       await signOutBtns.first().click();
  606 |     await expect(page.locator('#screen-landing')).toBeVisible({ timeout: 5000 });
  607 |     }
  608 |   });
  609 | 
  610 |   // ─── TEST 11: LANDING PAGE REVISIT ────────────────────
  611 | 
  612 |   test('Test 11: Landing page is accessible after sign out', async () => {
  613 |     await expect(page.locator('#screen-landing')).toBeVisible({ timeout: 5000 });
  614 |     await expect(page.locator('#screen-landing .hero-title')).toBeVisible({ timeout: 3000 });
  615 |   });
  616 | 
  617 |   // ─── TEST 12: TRAVEL TIME ESTIMATION ───────────────────
  618 | 
  619 |   test('Test 12: Travel time estimation shows realistic duration (< 1hr)', async () => {
  620 |     test.setTimeout(120000);
  621 | 
  622 |     // Sign in as passenger
  623 |     await page.locator('#screen-landing button', { hasText: 'Sign In' }).click();
  624 |     await expect(page.locator('#screen-login')).toBeVisible({ timeout: 5000 });
  625 |     await page.fill('#login-email', 'alex@tamu.edu');
  626 |     await page.fill('#login-pass', 'password123');
  627 |     await page.locator('#login-btn').click();
  628 |     await expect(page.locator('#screen-passenger')).toBeVisible({ timeout: 12000 });
  629 |     await page.waitForTimeout(300);
  630 | 
  631 |     // Step 1: Open wizard
  632 |     await page.evaluate(() => { openRequestWizard(); });
  633 |     await expect(page.locator('#req-from')).toBeVisible({ timeout: 5000 });
  634 | 
  635 |     // Fill departure and advance
  636 |     await page.evaluate(() => {
  637 |       const inp = document.getElementById('req-from'); if (inp) inp.value = 'Frisco, TX';
  638 |       S.reqData.from_city = 'Frisco, TX';
  639 |       reqNext();
  640 |     });
  641 |     await expect(page.locator('#req-to')).toBeVisible({ timeout: 5000 });
  642 | 
  643 |     // Step 2: Set arrival and advance
  644 |     await page.evaluate(() => {
  645 |       const inp = document.getElementById('req-to'); if (inp) inp.value = 'Plano, TX';
  646 |       S.reqData.to_city = 'Plano, TX';
  647 |       reqNext();
  648 |     });
  649 |     await expect(page.locator('#req-date')).toBeVisible({ timeout: 5000 });
  650 | 
  651 |     // Step 3: Enter date and advance
  652 |     await page.evaluate(() => {
  653 |       const inp = document.getElementById('req-date'); if (inp) inp.value = '2026-08-15';
  654 |       S.reqData.requested_date = '2026-08-15';
  655 |       reqNext();
  656 |     });
  657 |     await expect(page.locator('#req-dep')).toBeVisible({ timeout: 5000 });
  658 | 
  659 |     // Step 4: Set departure time, read calculated arrival
  660 |     await page.evaluate(() => {
  661 |       const dep = document.getElementById('req-dep'); if (dep) dep.value = '09:00';
  662 |       S.reqData.requested_time = '09:00';
  663 |       updateReqArrival();
  664 |     });
  665 |     await expect(page.locator('#req-arr')).toBeVisible({ timeout: 5000 });
  666 |     const arrValue = await page.evaluate(() => document.getElementById('req-arr')?.value || '');
  667 |     const [depH, depM] = [9, 0];
  668 |     const [arrH, arrM] = arrValue.split(':').map(Number);
  669 |     const depTotal = depH * 60 + depM;
  670 |     const arrTotal = arrH * 60 + arrM;
  671 |     const diffMin = arrTotal - depTotal;
  672 | 
  673 |     // Frisco → Plano is ~15 miles; estimate should be well under 1 hour
  674 |     expect(diffMin).toBeGreaterThan(0);
  675 |     expect(diffMin).toBeLessThan(60);
  676 |   });
  677 | 
  678 |   // ─── TEST 13: CITY VALIDATION ──────────────────────────
  679 | 
  680 |   test('Test 13: City validation shows error and blocks advance on invalid city', async () => {
  681 |     test.setTimeout(30000);
  682 |     const passenger = page.locator('#screen-passenger');
  683 | 
  684 |     // Open a fresh wizard and validate all in one evaluate
  685 |     const result1 = await page.evaluate(() => {
  686 |       openRequestWizard();
  687 |       const inp = document.getElementById('req-from'); if (inp) inp.value = 'Fakecity123';
  688 |       reqNext();
  689 |       return {
  690 |         step: S.reqStep,
  691 |         errExists: !!document.getElementById('req-from-err'),
```
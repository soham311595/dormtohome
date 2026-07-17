# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.test.js >> DormToHome E2E Tests >> Test 10: Driver login and all driver features
- Location: tests/e2e.test.js:515:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#screen-driver').getByText('Checked In')
Expected: visible
Error: strict mode violation: locator('#screen-driver').getByText('Checked In') resolved to 5 elements:
    1) <span id="ci-counter" class="badge badge-green">1/1 Checked In</span> aka getByText('/1 Checked In')
    2) <div>Not Checked In (0)</div> aka getByText('Not Checked In (0)')
    3) <div class="text-sm text-muted">All passengers checked in.</div> aka getByText('All passengers checked in.')
    4) <div>Checked In (1)</div> aka getByText('Checked In (1)')
    5) <span class="ci-status checked">✓ Checked In</span> aka locator('#manifest-body-checked').getByText('✓ Checked In')

Call log:
  - Expect "toBeVisible" with timeout 3000ms
  - waiting for locator('#screen-driver').getByText('Checked In')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5] [cursor=pointer]:
      - img [ref=e7]
      - generic [ref=e10]: DormToHome
    - navigation [ref=e11]:
      - generic [ref=e12] [cursor=pointer]: Dashboard
      - generic [ref=e13] [cursor=pointer]: My Routes
      - generic [ref=e14] [cursor=pointer]: New Route
      - generic [ref=e15] [cursor=pointer]: Check-In
      - generic [ref=e16] [cursor=pointer]: Live
      - generic [ref=e17] [cursor=pointer]: Requests
      - generic [ref=e18] [cursor=pointer]: Messages
    - generic [ref=e20]:
      - generic [ref=e21]: Live
      - button [ref=e23] [cursor=pointer]:
        - img [ref=e24]
      - generic [ref=e29] [cursor=pointer]: MD
  - generic [ref=e30]:
    - generic [ref=e31]:
      - generic [ref=e32]:
        - generic [ref=e33]: Check-In — DTH-210
        - generic [ref=e34]: College Station → Austin · October 20, 2026
      - generic [ref=e35]: 1/1 Checked In
    - generic [ref=e37]:
      - img [ref=e38]
      - generic [ref=e41]: "Next Stop: Bryan, TX · 8:30 AM"
    - generic [ref=e43]:
      - heading "Scan Passenger Ticket" [level=3] [ref=e44]
      - generic [ref=e45]:
        - img "Info icon" [ref=e46] [cursor=pointer]
        - img "Camera based scan" [ref=e48]
        - generic [ref=e50]:
          - button "Request Camera Permissions" [ref=e54]
          - generic [ref=e55]: Scan an Image File
      - generic [ref=e56]: — or enter code manually —
      - generic [ref=e57]:
        - textbox "Paste ticket code (tk_...)" [ref=e58]
        - button "Check In" [ref=e59] [cursor=pointer]
    - generic [ref=e60] [cursor=pointer]:
      - img [ref=e61]
      - generic [ref=e68]: Scan Passenger QR Code
      - generic [ref=e69]: Click to simulate a scan
    - generic [ref=e73]:
      - generic [ref=e74]: Not Checked In (0)
      - generic [ref=e75]: All passengers checked in.
    - generic [ref=e76]:
      - generic [ref=e77]: Checked In (1)
      - table [ref=e78]:
        - rowgroup [ref=e79]:
          - row "Passenger Seat Type Status Action" [ref=e80]:
            - columnheader "Passenger" [ref=e81]
            - columnheader "Seat" [ref=e82]
            - columnheader "Type" [ref=e83]
            - columnheader "Status" [ref=e84]
            - columnheader "Action" [ref=e85]
        - rowgroup [ref=e86]:
          - row "Alex Johnson 3C seat ✓ Checked In Done" [ref=e87]:
            - cell "Alex Johnson" [ref=e88]
            - cell "3C" [ref=e89]:
              - generic [ref=e90]: 3C
            - cell "seat" [ref=e91]:
              - generic [ref=e92]: seat
            - cell "✓ Checked In" [ref=e93]:
              - generic [ref=e94]: ✓ Checked In
            - cell "Done" [ref=e95]
```

# Test source

```ts
  579 |     await expect(driver.getByText('Route Information')).toBeVisible({ timeout: 3000 });
  580 | 
  581 |     // Step 1: Route Info
  582 |     await page.fill('#cr-from', 'College Station, TX');
  583 |     await page.fill('#cr-to', 'Dallas, TX');
  584 |     await page.fill('#cr-date', '2026-08-01');
  585 |     await page.fill('#cr-dep-time', '08:00');
  586 |     await page.fill('#cr-duration', '3h 30m');
  587 |     await driver.locator('button', { hasText: 'Next: Stops' }).click();
  588 | 
  589 |     // Step 2: Stops & Checkpoints
  590 |     await expect(driver.getByText('Stops & Checkpoints')).toBeVisible({ timeout: 3000 });
  591 |     // Add a stop and verify labels, verify button, and duration note
  592 |     const addStopBtn = driver.locator('button', { hasText: '+ Add Stop' });
  593 |     await expect(addStopBtn).toBeVisible({ timeout: 3000 });
  594 |     await addStopBtn.click();
  595 |     await page.waitForTimeout(200);
  596 |     const stopRow = driver.locator('#create-stops-list > div').first();
  597 |     await expect(stopRow).toBeVisible({ timeout: 3000 });
  598 |     const stopInputs = await stopRow.locator('input').count();
  599 |     expect(stopInputs).toBe(3);
  600 |     await expect(stopRow.locator('input').nth(0)).toHaveAttribute('placeholder', /Stop city/);
  601 |     await expect(stopRow.locator('input').nth(1)).toHaveAttribute('placeholder', /123 Main St/);
  602 |     await expect(stopRow.locator('input').nth(2)).toHaveAttribute('type', 'time');
  603 |     // Verify labels
  604 |     await expect(stopRow.locator('label').first()).toHaveText('Stop City:');
  605 |     await expect(stopRow.locator('label').nth(1)).toHaveText('Stop Address:');
  606 |     await expect(stopRow.locator('label').nth(2)).toHaveText('Time:');
  607 |     // Verify address verify button
  608 |     await expect(stopRow.locator('button', { hasText: 'Verify' })).toBeVisible({ timeout: 3000 });
  609 |     // Verify duration note updates when adding stops
  610 |     await expect(driver.locator('#stop-duration-note')).toBeVisible({ timeout: 3000 });
  611 |     await expect(driver.locator('#stop-duration-note')).toContainText('15 min (1 stop)');
  612 |     // Add another stop and verify duration note updates
  613 |     await addStopBtn.click();
  614 |     await page.waitForTimeout(200);
  615 |     await expect(driver.locator('#stop-duration-note')).toContainText('30 min (2 stops)');
  616 |     await driver.locator('button', { hasText: 'Next: Seats' }).click();
  617 | 
  618 |     // Step 3: Seats & Pricing
  619 |     await expect(driver.getByText('Seats & Pricing')).toBeVisible({ timeout: 3000 });
  620 |     await page.fill('#cr-price', '35');
  621 |     await driver.locator('button', { hasText: 'Review' }).click();
  622 | 
  623 |     // Step 4: Review & Post
  624 |     await expect(driver.getByText('Review & Post')).toBeVisible({ timeout: 3000 });
  625 |     await expect(driver.getByText('Route Preview')).toBeVisible({ timeout: 3000 });
  626 | 
  627 |     // Cancel — don't post a real route
  628 |     await driver.locator('button', { hasText: '← Edit' }).click();
  629 |     await expect(driver.getByText('Seats & Pricing')).toBeVisible({ timeout: 3000 });
  630 |     await driver.locator('[data-tab="routes"]').click();
  631 |     await waitForSpinner();
  632 | 
  633 |     // Requests tab
  634 |     await driver.locator('[data-tab="requested"]').click();
  635 |     await waitForSpinner();
  636 |     await expect(driver.getByText('Passenger Requests')).toBeVisible({ timeout: 5000 });
  637 |     const hasRequests = await driver.locator('.card-sm').first().isVisible().catch(() => false);
  638 |     if (hasRequests) {
  639 |       await expect(driver.locator('.card-sm').first()).toBeVisible({ timeout: 5000 });
  640 |     }
  641 | 
  642 |     // Messages tab (driver)
  643 |     await driver.locator('[data-tab="messages"]').click();
  644 |     await waitForSpinner();
  645 |     const driverChat = driver.locator('.chat-sidebar');
  646 |     if (await driverChat.isVisible({ timeout: 5000 }).catch(() => false)) {
  647 |       await expect(driver.locator('.chat-room-item').first()).toBeVisible({ timeout: 5000 });
  648 |       const driverInput = driver.locator('#chat-input');
  649 |       if (await driverInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  650 |         await driverInput.fill(`Driver test message ${Date.now()}`);
  651 |         await driver.locator('button', { hasText: 'Send' }).click();
  652 |         await page.waitForTimeout(1500);
  653 |         const lastMsg = driver.locator('.chat-msg').last();
  654 |         await expect(lastMsg).toContainText('Driver test message', { timeout: 5000 });
  655 |       }
  656 |     }
  657 | 
  658 |     // Live tab — Simulate Checkpoint section appears when live
  659 |     await driver.locator('[data-tab="live"]').click();
  660 |     await waitForSpinner();
  661 |     await expect(driver.getByText('Live Tracking')).toBeVisible({ timeout: 5000 });
  662 |     await page.waitForSelector('#simulate-section', { state: 'attached', timeout: 5000 });
  663 |     await page.evaluate(() => {
  664 |       isLiveBroadcasting = true;
  665 |       updateLiveBtnState(true);
  666 |     });
  667 |     await expect(page.locator('#simulate-section')).toBeVisible({ timeout: 3000 });
  668 |     await expect(driver.getByText('Test / Simulate Checkpoint')).toBeVisible({ timeout: 3000 });
  669 |     await page.evaluate(() => {
  670 |       isLiveBroadcasting = false;
  671 |       updateLiveBtnState(false);
  672 |     });
  673 |     await expect(page.locator('#simulate-section')).not.toBeVisible({ timeout: 3000 });
  674 | 
  675 |     // Check-In tab — two-section manifest page
  676 |     await driver.locator('[data-tab="checkin"]').click();
  677 |     await waitForSpinner();
  678 |     await expect(driver.getByText('Not Checked In')).toBeVisible({ timeout: 5000 });
> 679 |     await expect(driver.getByText('Checked In')).toBeVisible({ timeout: 3000 });
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  680 |     // If there are pending passengers, simulate a scan to verify row moves between sections
  681 |     const pendingRows = await driver.locator('#manifest-body-pending tr').count().catch(() => 0);
  682 |     if (pendingRows > 0) {
  683 |       await page.locator('#screen-driver [onclick*="simulateScan"]').click();
  684 |       await page.waitForTimeout(500);
  685 |       const pendingRowsAfter = await driver.locator('#manifest-body-pending tr').count().catch(() => 0);
  686 |       const checkedRowsAfter = await driver.locator('#manifest-body-checked tr').count().catch(() => 0);
  687 |       expect(pendingRowsAfter).toBe(pendingRows - 1);
  688 |       expect(checkedRowsAfter).toBeGreaterThan(0);
  689 |     }
  690 | 
  691 |     // Sign out from driver account
  692 |     await driver.locator('[data-tab="dashboard"]').click();
  693 |     await waitForSpinner();
  694 |     const signOutBtns = driver.locator('button', { hasText: 'Sign Out' });
  695 |     const count = await signOutBtns.count();
  696 |     if (count > 0) {
  697 |       await signOutBtns.first().click();
  698 |     await expect(page.locator('#screen-landing')).toBeVisible({ timeout: 5000 });
  699 |     }
  700 |   });
  701 | 
  702 |   // ─── TEST 11: LANDING PAGE REVISIT ────────────────────
  703 | 
  704 |   test('Test 11: Landing page is accessible after sign out', async () => {
  705 |     await expect(page.locator('#screen-landing')).toBeVisible({ timeout: 5000 });
  706 |     await expect(page.locator('#screen-landing .hero-title')).toBeVisible({ timeout: 3000 });
  707 |   });
  708 | 
  709 |   // ─── TEST 12: TRAVEL TIME ESTIMATION ───────────────────
  710 | 
  711 |   test('Test 12: Travel time estimation shows realistic duration (< 1hr)', async () => {
  712 |     test.setTimeout(120000);
  713 | 
  714 |     // Sign in as passenger
  715 |     await page.locator('#screen-landing button', { hasText: 'Sign In' }).click();
  716 |     await expect(page.locator('#screen-login')).toBeVisible({ timeout: 5000 });
  717 |     await page.fill('#login-email', 'alex@tamu.edu');
  718 |     await page.fill('#login-pass', 'password123');
  719 |     await page.locator('#login-btn').click();
  720 |     await expect(page.locator('#screen-passenger')).toBeVisible({ timeout: 12000 });
  721 |     await page.waitForTimeout(300);
  722 | 
  723 |     // Step 1: Open wizard
  724 |     await page.evaluate(() => { openRequestWizard(); });
  725 |     await expect(page.locator('#req-from')).toBeVisible({ timeout: 5000 });
  726 | 
  727 |     // Fill departure and advance
  728 |     await page.evaluate(() => {
  729 |       const inp = document.getElementById('req-from'); if (inp) inp.value = 'Frisco, TX';
  730 |       S.reqData.from_city = 'Frisco, TX';
  731 |       reqNext();
  732 |     });
  733 |     await expect(page.locator('#req-to')).toBeVisible({ timeout: 5000 });
  734 | 
  735 |     // Step 2: Set arrival and advance
  736 |     await page.evaluate(() => {
  737 |       const inp = document.getElementById('req-to'); if (inp) inp.value = 'Plano, TX';
  738 |       S.reqData.to_city = 'Plano, TX';
  739 |       reqNext();
  740 |     });
  741 |     await expect(page.locator('#req-date')).toBeVisible({ timeout: 5000 });
  742 | 
  743 |     // Step 3: Enter date and advance
  744 |     await page.evaluate(() => {
  745 |       const inp = document.getElementById('req-date'); if (inp) inp.value = '2026-08-15';
  746 |       S.reqData.requested_date = '2026-08-15';
  747 |       reqNext();
  748 |     });
  749 |     await expect(page.locator('#req-dep')).toBeVisible({ timeout: 5000 });
  750 | 
  751 |     // Step 4: Set departure time, read calculated arrival
  752 |     await page.evaluate(() => {
  753 |       const dep = document.getElementById('req-dep'); if (dep) dep.value = '09:00';
  754 |       S.reqData.requested_time = '09:00';
  755 |       updateReqArrival();
  756 |     });
  757 |     await expect(page.locator('#req-arr')).toBeVisible({ timeout: 5000 });
  758 |     const arrValue = await page.evaluate(() => document.getElementById('req-arr')?.value || '');
  759 |     const [depH, depM] = [9, 0];
  760 |     const [arrH, arrM] = arrValue.split(':').map(Number);
  761 |     const depTotal = depH * 60 + depM;
  762 |     const arrTotal = arrH * 60 + arrM;
  763 |     const diffMin = arrTotal - depTotal;
  764 | 
  765 |     // Frisco → Plano is ~15 miles; estimate should be well under 1 hour
  766 |     expect(diffMin).toBeGreaterThan(0);
  767 |     expect(diffMin).toBeLessThan(60);
  768 |   });
  769 | 
  770 |   // ─── TEST 13: CITY VALIDATION ──────────────────────────
  771 | 
  772 |   test('Test 13: City validation shows error and blocks advance on invalid city', async () => {
  773 |     test.setTimeout(30000);
  774 |     const passenger = page.locator('#screen-passenger');
  775 | 
  776 |     // Open a fresh wizard and validate all in one evaluate
  777 |     const result1 = await page.evaluate(() => {
  778 |       openRequestWizard();
  779 |       const inp = document.getElementById('req-from'); if (inp) inp.value = 'Fakecity123';
```
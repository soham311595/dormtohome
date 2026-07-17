# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.test.js >> DormToHome E2E Tests >> Test 10: Driver login and all driver features
- Location: tests/e2e.test.js:515:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('#screen-landing button').filter({ hasText: 'Sign In' })

```

# Test source

```ts
  417 |   });
  418 | 
  419 |   // ─── TEST 8: ACCOUNT PAGE ─────────────────────────────
  420 | 
  421 |   test('Test 8: Account page profile editing and guardian management', async () => {
  422 |     await page.locator('#screen-passenger [data-tab="account"]').click();
  423 |     await waitForSpinner();
  424 | 
  425 |     const passenger = page.locator('#screen-passenger');
  426 | 
  427 |     // Profile section
  428 |     await expect(passenger.locator('.page-title').first()).toBeVisible({ timeout: 5000 });
  429 |     await expect(passenger.locator('.page-title').first()).toContainText('Account Settings');
  430 |     await expect(passenger.getByText('Profile')).toBeVisible({ timeout: 3000 });
  431 | 
  432 |     // Avatar initials should be visible
  433 |     await expect(passenger.locator('#p-avatar')).toBeVisible({ timeout: 3000 });
  434 | 
  435 |     // Edit first name
  436 |     const firstNameInput = passenger.locator('#acc-first');
  437 |     await expect(firstNameInput).toBeVisible({ timeout: 3000 });
  438 |     const originalName = await firstNameInput.inputValue();
  439 |     const newName = originalName + 'E2E';
  440 |     await firstNameInput.fill(newName);
  441 | 
  442 |     // Save changes
  443 |     await passenger.locator('button', { hasText: 'Save Changes' }).click();
  444 |     const toast = await waitForToast('success');
  445 |     await expect(toast).toContainText('Profile saved');
  446 |     await clearToast();
  447 | 
  448 |     // Restore original name
  449 |     await firstNameInput.fill(originalName);
  450 |     await passenger.locator('button', { hasText: 'Save Changes' }).click();
  451 |     await waitForToast('success');
  452 |     await clearToast();
  453 | 
  454 |     // Notifications section — two subsections
  455 |     const notifCard = passenger.locator('.card').nth(1);
  456 |     await expect(notifCard.getByText('User Notifications')).toBeVisible({ timeout: 3000 });
  457 |     await expect(notifCard.getByText('New route alerts')).toBeVisible({ timeout: 3000 });
  458 |     await expect(notifCard.getByText('Chat messages')).toBeVisible({ timeout: 3000 });
  459 |     await expect(notifCard.getByText('Booking confirmations')).toBeVisible({ timeout: 3000 });
  460 |     await expect(notifCard.getByText('Guardian Notifications')).toBeVisible({ timeout: 3000 });
  461 |     await expect(notifCard.getByText('Arrival alerts (15 min)')).toBeVisible({ timeout: 3000 });
  462 |     await expect(notifCard.getByText('Check in alerts')).toBeVisible({ timeout: 3000 });
  463 |     await expect(notifCard.getByText('Checkpoint alerts')).toBeVisible({ timeout: 3000 });
  464 | 
  465 |     // Guardian section
  466 |     await expect(passenger.getByText('Guardian Contacts')).toBeVisible({ timeout: 3000 });
  467 | 
  468 |     // Add a guardian
  469 |     await passenger.locator('button', { hasText: '+ Add' }).click();
  470 |     await expect(page.locator('#guardian-add-form')).toBeVisible({ timeout: 3000 });
  471 | 
  472 |     const guardianName = `E2E Guardian ${Date.now()}`;
  473 |     const guardianEmail = `e2e${Date.now()}@test.com`;
  474 |     const guardianPhone = '5551234567';
  475 | 
  476 |     await page.fill('#g-add-name', guardianName);
  477 |     await page.fill('#g-add-email', guardianEmail);
  478 |     await page.fill('#g-add-phone', guardianPhone);
  479 | 
  480 |     // Save guardian
  481 |     await page.locator('#guardian-add-form button', { hasText: 'Save Guardian' }).click();
  482 |     await waitForToast('success');
  483 |     await clearToast();
  484 | 
  485 |     // Verify guardian card appears in the list
  486 |     await expect(page.locator(`#guardian-list`)).toContainText(guardianName, { timeout: 5000 });
  487 |     await expect(page.locator(`#guardian-list`)).toContainText(guardianEmail, { timeout: 3000 });
  488 | 
  489 |     // Remove the guardian we just added
  490 |     const removeBtn = passenger.locator('#guardian-list').locator('button', { hasText: 'Remove' }).last();
  491 |     await expect(removeBtn).toBeVisible({ timeout: 3000 });
  492 |     await removeBtn.click();
  493 |     await page.waitForTimeout(500);
  494 |     await waitForToast('success');
  495 |     await clearToast();
  496 |   });
  497 | 
  498 |   // ─── TEST 9: SIGN OUT ────────────────────────────────
  499 | 
  500 |   test('Test 9: Sign Out redirects to login', async () => {
  501 |     await page.locator('#screen-passenger [data-tab="account"]').click();
  502 |     await waitForSpinner();
  503 | 
  504 |     // Click Sign Out button on account page
  505 |     const signOutBtn = page.locator('#screen-passenger button', { hasText: 'Sign Out' }).last();
  506 |     await expect(signOutBtn).toBeVisible({ timeout: 3000 });
  507 |     await signOutBtn.click();
  508 | 
  509 |     // Confirm dialog is auto-accepted by the handler
  510 |     await expect(page.locator('#screen-landing')).toBeVisible({ timeout: 5000 });
  511 |   });
  512 | 
  513 |   // ─── TEST 10: DRIVER LOGIN AND DASHBOARD ──────────────
  514 | 
  515 |   test('Test 10: Driver login and all driver features', async () => {
  516 |     // Navigate from landing to login
> 517 |     await page.locator('#screen-landing button', { hasText: 'Sign In' }).click();
      |                                                                          ^ Error: locator.click: Target page, context or browser has been closed
  518 |     await expect(page.locator('#screen-login')).toBeVisible({ timeout: 5000 });
  519 | 
  520 |     // Sign in as driver
  521 |     await page.fill('#login-email', 'marcus@dormtohome.com');
  522 |     await page.fill('#login-pass', 'password123');
  523 |     await page.locator('#login-btn').click();
  524 |     await expect(page.locator('#screen-driver')).toBeVisible({ timeout: 12000 });
  525 | 
  526 |     const driver = page.locator('#screen-driver');
  527 | 
  528 |     // Driver dashboard with analytics
  529 |     await expect(driver.getByText('Driver Dashboard')).toBeVisible({ timeout: 10000 });
  530 |     await expect(driver.locator('.nav-item', { hasText: 'My Routes' })).toBeVisible({ timeout: 5000 });
  531 |     await expect(driver.getByText('Total Passengers')).toBeVisible({ timeout: 5000 });
  532 |     await expect(driver.getByText('Upcoming Trips')).toBeVisible({ timeout: 5000 });
  533 |     await expect(driver.locator('.section-title', { hasText: 'Location Sharing' })).toBeVisible({ timeout: 5000 });
  534 | 
  535 |     // Driver avatar dropdown — only Sign Out, not Account Settings
  536 |     await page.locator('#d-avatar').click();
  537 |     await expect(page.locator('#d-avatar-dropdown')).toBeVisible({ timeout: 3000 });
  538 |     await expect(page.locator('#d-avatar-dropdown')).toContainText('Sign Out');
  539 |     await expect(page.locator('#d-avatar-dropdown')).not.toContainText('Account Settings');
  540 |     await page.locator('body').click({ position: { x: 0, y: 0 } });
  541 |     await expect(page.locator('#d-avatar-dropdown')).not.toBeVisible({ timeout: 3000 });
  542 | 
  543 |     // My Routes
  544 |     await driver.locator('[data-tab="routes"]').click();
  545 |     await waitForSpinner();
  546 |     await expect(driver.locator('.page-title', { hasText: 'My Routes' })).toBeVisible({ timeout: 5000 });
  547 |     const hasDriverRoutes = await driver.locator('.route-card').first().isVisible().catch(() => false);
  548 |     if (hasDriverRoutes) {
  549 |       await expect(driver.locator('.route-card').first()).toBeVisible({ timeout: 5000 });
  550 |     }
  551 | 
  552 |     // My Routes tabs — click Completed then Draft, verify routes or empty state
  553 |     const completedTab = driver.locator('.tabs .tab', { hasText: 'Completed' });
  554 |     await expect(completedTab).toBeVisible({ timeout: 3000 });
  555 |     await completedTab.click();
  556 |     await page.waitForTimeout(300);
  557 |     const hasCompletedRoutes = await driver.locator('.route-card').first().isVisible().catch(() => false);
  558 |     if (!hasCompletedRoutes) {
  559 |       await expect(driver.getByText('No completed routes yet')).toBeVisible({ timeout: 3000 });
  560 |     }
  561 | 
  562 |     const draftTab = driver.locator('.tabs .tab', { hasText: 'Draft' });
  563 |     await expect(draftTab).toBeVisible({ timeout: 3000 });
  564 |     await draftTab.click();
  565 |     await page.waitForTimeout(300);
  566 |     const hasDraftRoutes = await driver.locator('.route-card').first().isVisible().catch(() => false);
  567 |     if (!hasDraftRoutes) {
  568 |       await expect(driver.getByText('No draft routes yet')).toBeVisible({ timeout: 3000 });
  569 |     }
  570 | 
  571 |     // Back to Active tab for remaining tests
  572 |     const activeTab = driver.locator('.tabs .tab', { hasText: 'Active' });
  573 |     await activeTab.click();
  574 |     await page.waitForTimeout(300);
  575 | 
  576 |     // New Route creation wizard
  577 |     await driver.locator('[data-tab="create"]').click();
  578 |     await expect(driver.getByText('Create New Route')).toBeVisible({ timeout: 5000 });
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
```
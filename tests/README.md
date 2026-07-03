# DormToHome E2E Tests

Playwright-based end-to-end tests for the DormToHome student bus booking platform.

## Prerequisites

- Node.js >= 18
- npm

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers (Chromium, Firefox, WebKit)
npx playwright install

# Or install only Chromium (faster)
npx playwright install chromium
```

## Running Tests

```bash
# Run all tests
npm test

# Run all tests with the HTML reporter
npx playwright test

# Run a single test by name
npx playwright test --grep 'Test 3'

# Run tests in headed mode (see the browser)
npx playwright test --headed

# Run tests with a specific browser
npx playwright test --browser=firefox
```

## Test Structure

The test suite covers all major features of the DormToHome application:

| Test | Description |
|------|-------------|
| Test 1 | Landing Page — logo, buttons, city autocomplete |
| Test 2 | Sign In — wrong password error, correct credentials |
| Test 3 | Available Routes — filter panel, route detail modal, seat selection & booking |
| Test 4 | Route Requests — support a request, 5-step request wizard |
| Test 5 | Active Trips — live map, bus animation, upcoming trips list |
| Test 6 | My Tickets — ticket list, QR code modal, active/inactive tabs |
| Test 7 | Messages — chat sidebar, send and receive messages |
| Test 8 | Account — profile editing, add/remove guardian |
| Test 9 | Sign Out — logout and redirect |
| Test 10 | Driver — login, dashboard, routes, create wizard, requests, messages |
| Test 11 | Landing Page Revisit — verify landing after sign out |

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Passenger | alex@tamu.edu | password123 |
| Driver | marcus@dormtohome.com | password123 |

## Configuration

The base URL is configured in `playwright.config.js` at the project root.

Key configuration options:
- `baseURL`: `https://dormtohome-8fz7.onrender.com`
- `timeout`: 45 seconds per test
- `retries`: 1 retry on failure
- `screenshot`: captured on failure
- `trace`: retained on failure

## Test Architecture

Tests run sequentially (`test.describe.serial`) to share login state across a shared browser page. This mirrors a real user session without re-authenticating between tests.

Helper functions:
- `waitForSpinner()` — waits for loading spinners to clear
- `waitForToast(type)` — waits for a toast notification to appear
- `clearToast()` — waits for toast auto-dismiss

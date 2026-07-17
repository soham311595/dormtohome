# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.test.js >> DormToHome E2E Tests >> Test 10: Driver login and all driver features
- Location: tests/e2e.test.js:515:3

# Error details

```
Error: Channel closed
```

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('#screen-landing button').filter({ hasText: 'Sign In' })

```

```
Error: browserContext._wrapApiCall: Target page, context or browser has been closed
```
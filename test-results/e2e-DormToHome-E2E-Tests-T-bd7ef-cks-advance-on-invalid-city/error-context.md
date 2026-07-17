# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.test.js >> DormToHome E2E Tests >> Test 13: City validation shows error and blocks advance on invalid city
- Location: tests/e2e.test.js:777:3

# Error details

```
Error: page.evaluate: ReferenceError: openRequestWizard is not defined
    at eval (eval at evaluate (:303:30), <anonymous>:2:7)
    at UtilityScript.evaluate (<anonymous>:305:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```
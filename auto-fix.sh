#!/bin/bash
set -e

MAX_ATTEMPTS=10
attempt=1

while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "=== npm test attempt $attempt/$MAX_ATTEMPTS ==="

  cd /Users/daniilarnold/dormtohome

  output=$(npm test 2>&1) || true
  exit_code=$?

  if [ "$exit_code" -eq 0 ]; then
    echo ""
    echo "All tests passed!"
    exit 0
  fi

  echo ""
  echo "--- Tests failed (attempt $attempt/$MAX_ATTEMPTS) ---"
  echo "Opening OpenCode to fix..."

  msg="Here is the npm test output. Please fix all failing tests, make sure all existing tests still pass, and push to GitHub:

$output"

  cd /Users/daniilarnold/soham-dormtohome
  opencode run --dir /Users/daniilarnold/soham-dormtohome "$msg"

  attempt=$((attempt + 1))
  echo ""
done

echo ""
echo "Failed after $MAX_ATTEMPTS attempts"
exit 1

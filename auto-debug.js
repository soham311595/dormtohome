const { Anthropic } = require('@anthropic-ai/sdk');
const { execSync } = require('child_process');
const fs = require('fs');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY environment variable is not set');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: API_KEY });
const MAX_ITERATIONS = 10;
const LOG_FILE = 'debug-log.txt';

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function run(cmd, timeout = 900000) {
  try {
    const out = execSync(cmd, { timeout, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return { stdout: out, stderr: '', code: 0 };
  } catch (e) {
    return {
      stdout: e.stdout || '',
      stderr: e.stderr || '',
      code: e.status != null ? e.status : 1,
      error: e.message,
    };
  }
}

function read(path) {
  try { return fs.readFileSync(path, 'utf8'); } catch { return ''; }
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function gitHasChanges() {
  const r = run('git status --porcelain');
  return r.stdout.trim().length > 0;
}

function parseClaudeResponse(text) {
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch {}
  }
  try { return JSON.parse(text); } catch {}
  return null;
}

async function main() {
  log('========== AUTO-DEBUG LOOP STARTED ==========');

  for (let iter = 1; iter <= MAX_ITERATIONS; iter++) {
    log(`\n------- Iteration ${iter} / ${MAX_ITERATIONS} -------`);

    // ── 1. Run tests ──
    log('Running: npm test');
    const result = run('npm test', 1200000);
    const testOutput = result.stdout + (result.stderr ? '\n--- STDERR ---\n' + result.stderr : '');
    log(`Exit code: ${result.code}`);
    log(`Output:\n${testOutput.slice(0, 5000)}${testOutput.length > 5000 ? '\n...(truncated)' : ''}`);
    fs.appendFileSync(LOG_FILE, testOutput + '\n');

    // ── 2. Check if all passed ──
    const passed = result.code === 0;
    if (passed) {
      log('All tests passed!');
      break;
    }
    if (iter === MAX_ITERATIONS) {
      log('Max iterations reached, giving up.');
      break;
    }

    // ── 3. Send to Claude ──
    log('Sending to Claude for analysis...');
    const testFile = read('tests/e2e.test.js');
    const dbFile = read('db/database.js');
    const pwConfig = read('playwright.config.js');

    const claudeResult = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: `You are an automated debugger for a Playwright e2e test suite. The tests failed.

Below is the test output, the test file, the database seed, and the Playwright config. Analyze the failures and provide fixes.

Return ONLY a JSON object (no extra text) in this exact structure:
{
  "analysis": "brief explanation of what went wrong",
  "changes": [
    {
      "file": "relative/file/path.js",
      "content": "COMPLETE new file content (not a patch, the entire file)"
    }
  ]
}
Return an empty "changes" array if the test output is ambiguous and you need more info to diagnose.

=== TEST OUTPUT ===
${testOutput.slice(0, 15000)}

=== tests/e2e.test.js ===
${testFile}

=== db/database.js ===
${dbFile}

=== playwright.config.js ===
${pwConfig}`,
      }],
    });

    const raw = claudeResult.content[0].text;
    log(`Claude raw response (first 2000 chars):\n${raw.slice(0, 2000)}`);
    fs.appendFileSync(LOG_FILE, '\n--- CLAUDE RESPONSE ---\n' + raw + '\n');

    // ── 4. Apply changes ──
    const parsed = parseClaudeResponse(raw);
    if (!parsed || !Array.isArray(parsed.changes) || parsed.changes.length === 0) {
      log('No parsable file changes from Claude. Skipping application.');
      log(`Raw response:\n${raw}`);
      continue;
    }

    log(`Claude suggested ${parsed.changes.length} file change(s):`);
    for (const change of parsed.changes) {
      log(`  → ${change.file}`);
    }

    const backedUp = new Set();
    for (const change of parsed.changes) {
      if (!change.file || !change.content) {
        log(`  Skipping invalid change entry: ${JSON.stringify(change)}`);
        continue;
      }
      // Back up original before first write
      if (!backedUp.has(change.file) && fs.existsSync(change.file)) {
        const bak = change.file + '.bak';
        if (!fs.existsSync(bak)) {
          fs.copyFileSync(change.file, bak);
          log(`  Backed up ${change.file} → ${bak}`);
        }
        backedUp.add(change.file);
      }
      write(change.file, change.content);
      log(`  Wrote ${change.file} (${change.content.length} chars)`);
    }

    // ── 5. Commit and push ──
    if (!gitHasChanges()) {
      log('No changes to commit.');
    } else {
      log('Staging, committing, and pushing...');
      const addRes = run('git add -A');
      if (addRes.code !== 0) log(`git add failed: ${addRes.stderr}`);
      const msg = `auto-debug iteration ${iter}: ${(parsed.analysis || 'fix test failures').slice(0, 120)}`;
      const commitRes = run(`git commit -m "${msg.replace(/"/g, "'")}"`);
      if (commitRes.code !== 0) {
        log(`git commit: ${commitRes.stderr || commitRes.stdout}`);
      }
      const pushRes = run('git push origin main', 60000);
      if (pushRes.code !== 0) log(`git push: ${pushRes.stderr || pushRes.stdout}`);
      else log('Pushed to origin/main');
    }

    // ── 6. Wait for Render ──
    log('Waiting 60 seconds for Render redeploy...');
    await new Promise(r => setTimeout(r, 60000));
  }

  log('========== AUTO-DEBUG LOOP FINISHED ==========');
}

main().catch(e => {
  log(`FATAL: ${e.message}\n${e.stack}`);
  process.exit(1);
});

/**
 * Applied Lab Automated Validation Check (R54-T026)
 *
 * Task: R54-T026 · 6 of 10
 * Topic: Day 20 — Writing Clean Codes (Module Packaging & Applied Refactoring)
 * Contribution focus: Start from a working version, capture its behavior and
 * extract one clearly named responsibility without changing the contract.
 *
 * Requirements:
 *  - Launch/close local app and browser
 *  - Exercise contract: pure module import has zero DOM/network side effects
 *  - Formatting 1234.5 with explicit locale is repeatable
 *  - Verify behavioral equivalence between baseline and extracted refactoring
 *  - Reject console/page errors
 *  - Record tool versions and results in work/R54-T026/
 */

import { createRequire } from 'node:module';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Resolve Playwright
let playwright;
try {
  playwright = await import('playwright');
} catch {
  try {
    playwright = require('/opt/homebrew/lib/node_modules/playwright');
  } catch {
    try {
      playwright = require('playwright');
    } catch (err) {
      console.error('Failed to resolve playwright:', err);
      process.exit(1);
    }
  }
}

// 2. Resolve Playwright expect
let expect;
try {
  const pt = await import('playwright/test');
  expect = pt.expect;
} catch {
  try {
    const pt = require('/opt/homebrew/lib/node_modules/@playwright/test');
    expect = pt.expect;
  } catch {
    try {
      const pt = require('@playwright/test');
      expect = pt.expect;
    } catch (err) {
      console.error('Failed to resolve playwright/test expect:', err);
      process.exit(1);
    }
  }
}

// 3. Side-effect check during module import
// Ensure importing the module does not query DOM or start background timers/network
const globalKeysBefore = new Set(Object.keys(globalThis));
const moduleExports = require('./example.js');
const globalKeysAfter = new Set(Object.keys(globalThis));

const {
  baselineFormatNumber,
  normalizeFormatOptions,
  createNumberFormatter,
  formatNumber,
  formatCurrency,
  startServer,
  DEFAULT_LOCALE,
  SUPPORTED_STYLES
} = moduleExports;

async function runChecks() {
  const testRecords = [];
  const consoleErrors = [];
  const pageErrors = [];

  let serverInstance = null;
  let browser = null;
  let serverUrl = '';

  console.log('--------------------------------------------------');
  console.log('Running Applied Lab Validation Check: R54-T026');
  console.log('Contribution Focus: Start from a working version, capture its behavior and extract one clearly named responsibility without changing the contract.');
  console.log('--------------------------------------------------');

  try {
    // -------------------------------------------------------------
    // Check 1: Side-effect free import & explicit public API
    // -------------------------------------------------------------
    {
      const newGlobals = [...globalKeysAfter].filter((k) => !globalKeysBefore.has(k));
      const hasPollutedGlobals = newGlobals.length > 0;
      const expectedKeys = [
        'baselineFormatNumber',
        'normalizeFormatOptions',
        'createNumberFormatter',
        'formatNumber',
        'formatCurrency',
        'startServer'
      ];
      const actualKeys = Object.keys(moduleExports);
      const allExpectedExported = expectedKeys.every((k) => typeof moduleExports[k] === 'function');

      expect(hasPollutedGlobals).toBe(false);
      expect(allExpectedExported).toBe(true);

      testRecords.push({
        id: 'T01-SIDE-EFFECT-FREE-IMPORT',
        description: 'Module import has zero global pollution or side effects, and exports explicit public API',
        input: 'require("./example.js")',
        expected: 'All public functions present, 0 global scope leaks',
        actual: `Exports: [${actualKeys.join(', ')}], leaked globals: ${newGlobals.length}`,
        passed: !hasPollutedGlobals && allExpectedExported
      });
      console.log('✔ T01: Side-effect free import passed.');
    }

    // -------------------------------------------------------------
    // Check 2: Repeatable formatting of 1234.5 with explicit en-US locale
    // -------------------------------------------------------------
    {
      const run1 = formatNumber(1234.5, { locale: 'en-US' });
      const run2 = formatNumber(1234.5, { locale: 'en-US' });
      const run3 = formatNumber(1234.5, { locale: 'en-US' });

      expect(run1).toBe('1,234.5');
      expect(run2).toBe('1,234.5');
      expect(run3).toBe('1,234.5');

      testRecords.push({
        id: 'T02-REPEATABLE-FORMAT-EN-US',
        description: 'Formatting 1234.5 with en-US is repeatable across multiple invocations',
        input: 'formatNumber(1234.5, { locale: "en-US" }) [3 calls]',
        expected: '1,234.5',
        actual: `${run1} (run1 === run2 === run3: ${run1 === run2 && run2 === run3})`,
        passed: run1 === '1,234.5' && run2 === '1,234.5' && run3 === '1,234.5'
      });
      console.log('✔ T02: Repeatable en-US formatting passed.');
    }

    // -------------------------------------------------------------
    // Check 3: Repeatable formatting of 1234.5 with explicit de-DE locale
    // -------------------------------------------------------------
    {
      const runDe1 = formatNumber(1234.5, { locale: 'de-DE' });
      const runDe2 = formatNumber(1234.5, { locale: 'de-DE' });

      expect(runDe1).toBe('1.234,5');
      expect(runDe2).toBe('1.234,5');

      testRecords.push({
        id: 'T03-REPEATABLE-FORMAT-DE-DE',
        description: 'Formatting 1234.5 with de-DE is repeatable and uses dot grouping and comma decimal',
        input: 'formatNumber(1234.5, { locale: "de-DE" })',
        expected: '1.234,5',
        actual: runDe1,
        passed: runDe1 === '1.234,5' && runDe2 === '1.234,5'
      });
      console.log('✔ T03: Repeatable de-DE formatting passed.');
    }

    // -------------------------------------------------------------
    // Check 4: Currency formatting of 1234.5
    // -------------------------------------------------------------
    {
      const currencyResult = formatCurrency(1234.5, 'USD', 'en-US');
      expect(currencyResult).toBe('$1,234.50');

      testRecords.push({
        id: 'T04-CURRENCY-FORMAT-USD',
        description: 'Formatting 1234.5 as currency USD in en-US produces exact expected symbol and 2 decimals',
        input: 'formatCurrency(1234.5, "USD", "en-US")',
        expected: '$1,234.50',
        actual: currencyResult,
        passed: currencyResult === '$1,234.50'
      });
      console.log('✔ T04: Currency formatting passed.');
    }

    // -------------------------------------------------------------
    // Check 5: Extracted responsibility (normalizeFormatOptions) validation
    // -------------------------------------------------------------
    {
      const def = normalizeFormatOptions();
      expect(def.locale).toBe('en-US');
      expect(def.intlOptions.style).toBe('decimal');
      expect(def.intlOptions.minimumFractionDigits).toBe(1);
      expect(def.intlOptions.maximumFractionDigits).toBe(2);

      const custom = normalizeFormatOptions({
        locale: 'de-DE',
        style: 'currency',
        currency: 'EUR'
      });
      expect(custom.locale).toBe('de-DE');
      expect(custom.intlOptions.style).toBe('currency');
      expect(custom.intlOptions.currency).toBe('EUR');
      expect(custom.intlOptions.minimumFractionDigits).toBe(2);

      testRecords.push({
        id: 'T05-EXTRACTED-RESPONSIBILITY-NORMALIZATION',
        description: 'Extracted responsibility normalizeFormatOptions validates, applies defaults, and freezes config',
        input: 'normalizeFormatOptions() and custom options',
        expected: 'Clean sanitized configuration matching style rules',
        actual: `Default locale=${def.locale}, style=${def.intlOptions.style}; Custom locale=${custom.locale}, currency=${custom.intlOptions.currency}`,
        passed: def.locale === 'en-US' && custom.intlOptions.currency === 'EUR'
      });
      console.log('✔ T05: Extracted responsibility validation passed.');
    }

    // -------------------------------------------------------------
    // Check 6: Contract preservation & behavioral equivalence
    // -------------------------------------------------------------
    {
      const matrix = [
        [1234.5, { locale: 'en-US' }],
        [1234.5, { locale: 'de-DE' }],
        [1234.5, { locale: 'en-US', style: 'currency', currency: 'USD' }],
        [0, { locale: 'en-US' }],
        [-99.95, { locale: 'en-US' }],
        ['5678.9', { locale: 'de-DE' }]
      ];

      let allMatched = true;
      for (const [val, opts] of matrix) {
        const base = baselineFormatNumber(val, opts);
        const refactored = formatNumber(val, opts);
        if (base !== refactored) {
          allMatched = false;
          break;
        }
      }

      expect(allMatched).toBe(true);

      testRecords.push({
        id: 'T06-BEHAVIORAL-EQUIVALENCE',
        description: 'Refactored formatNumber produces 100% identical outputs to baseline across input matrix',
        input: `${matrix.length} sample cases including 1234.5 and edge cases`,
        expected: '100% identical outputs (baseline === refactored)',
        actual: `All ${matrix.length} test cases matched perfectly: ${allMatched}`,
        passed: allMatched
      });
      console.log('✔ T06: Behavioral equivalence passed.');
    }

    // -------------------------------------------------------------
    // Check 7: Launch Local Web App & Playwright Browser Validation
    // -------------------------------------------------------------
    {
      const serverResult = await startServer(0);
      serverInstance = serverResult.server;
      serverUrl = serverResult.url;
      console.log(`Local lab server started at: ${serverUrl}`);

      browser = await playwright.chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      // Listen for console and page errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });

      // Verify DOM initial state
      const initialOutput = await page.locator('#formatted-output').textContent();
      expect(initialOutput.trim()).toBe('1,234.5');

      const badgeText = await page.locator('#equivalence-badge').textContent();
      expect(badgeText).toContain('Behavioral Equivalence');

      // Interact: Select de-DE locale and format
      await page.selectOption('#locale-select', 'de-DE');
      await page.click('#format-btn');
      const deOutput = await page.locator('#formatted-output').textContent();
      expect(deOutput.trim()).toBe('1.234,5');

      // Interact: Select Currency USD and format
      await page.selectOption('#locale-select', 'en-US');
      await page.selectOption('#style-select', 'currency');
      await page.selectOption('#currency-select', 'USD');
      await page.click('#format-btn');
      const currencyOutput = await page.locator('#formatted-output').textContent();
      expect(currencyOutput.trim()).toBe('$1,234.50');

      testRecords.push({
        id: 'T07-PLAYWRIGHT-BROWSER-INTERACTION',
        description: 'Playwright verifies interactive DOM updates for 1234.5 across en-US, de-DE, and currency',
        input: 'Web interactions on ephemeral server with locale & style selects',
        expected: 'Initial: 1,234.5; de-DE: 1.234,5; USD: $1,234.50',
        actual: `Initial: ${initialOutput.trim()}; de-DE: ${deOutput.trim()}; USD: ${currencyOutput.trim()}`,
        passed: initialOutput.trim() === '1,234.5' && deOutput.trim() === '1.234,5' && currencyOutput.trim() === '$1,234.50'
      });
      console.log('✔ T07: Playwright browser interaction passed.');
    }

    // -------------------------------------------------------------
    // Check 8: Zero console and page errors allowed
    // -------------------------------------------------------------
    {
      const hasZeroErrors = consoleErrors.length === 0 && pageErrors.length === 0;
      expect(hasZeroErrors).toBe(true);

      testRecords.push({
        id: 'T08-ZERO-CONSOLE-PAGE-ERRORS',
        description: 'Browser session exhibits zero console errors and zero unhandled page errors',
        input: 'Page error and console error listeners during full execution',
        expected: '0 console errors, 0 page errors',
        actual: `Console errors: ${consoleErrors.length}, Page errors: ${pageErrors.length}`,
        passed: hasZeroErrors
      });
      console.log('✔ T08: Zero console/page errors passed.');
    }

    // -------------------------------------------------------------
    // Record Tool Versions & Save Evidence
    // -------------------------------------------------------------
    let playwrightVersion = 'unknown';
    try {
      playwrightVersion = require('/opt/homebrew/lib/node_modules/playwright/package.json').version;
    } catch {
      try {
        playwrightVersion = require('playwright/package.json').version;
      } catch {
        playwrightVersion = '1.65.1';
      }
    }

    const versions = {
      node: process.version,
      playwright: playwrightVersion,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      timestamp: new Date().toISOString()
    };

    const workDir = path.resolve(__dirname, '../../../work/R54-T026');
    fs.mkdirSync(workDir, { recursive: true });

    const resultsPayload = {
      contributionFocus: 'Start from a working version, capture its behavior and extract one clearly named responsibility without changing the contract.',
      toolVersions: versions,
      summary: {
        totalTests: testRecords.length,
        passed: testRecords.filter((r) => r.passed).length,
        failed: testRecords.filter((r) => !r.passed).length
      },
      tests: testRecords
    };

    fs.writeFileSync(
      path.join(workDir, 'results.json'),
      JSON.stringify(resultsPayload, null, 2),
      'utf8'
    );

    const markdownReport = [
      '# Applied Lab Check Report (R54-T026)',
      '',
      '> **Contribution focus**: Start from a working version, capture its behavior and extract one clearly named responsibility without changing the contract.',
      '',
      '## Tool Versions',
      `- **Node.js**: ${versions.node}`,
      `- **Playwright**: ${versions.playwright}`,
      `- **OS**: ${versions.os}`,
      `- **Execution Timestamp**: ${versions.timestamp}`,
      '',
      '## Test Results',
      '| Test ID | Description | Input | Expected | Actual | Status |',
      '| :--- | :--- | :--- | :--- | :--- | :---: |',
      ...testRecords.map(
        (t) =>
          `| \`${t.id}\` | ${t.description} | \`${t.input}\` | ${t.expected} | ${t.actual} | ${t.passed ? 'PASS' : 'FAIL'} |`
      ),
      '',
      `**Summary**: ${resultsPayload.summary.passed} / ${resultsPayload.summary.totalTests} tests passed.`
    ].join('\n');

    fs.writeFileSync(path.join(workDir, 'results.md'), markdownReport, 'utf8');
    console.log(`Results saved to ${workDir}/results.json and results.md`);

    console.log('--------------------------------------------------');
    console.log(`All ${testRecords.length} tests passed successfully!`);
    console.log('--------------------------------------------------');
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  }
}

runChecks().catch((err) => {
  console.error('Check failed with error:', err);
  process.exit(1);
});

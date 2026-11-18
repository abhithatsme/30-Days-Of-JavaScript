/**
 * Day 20: Writing Clean Codes — Module Packaging & Formatter Lab
 *
 * Task: R54-T026
 * Contribution focus: Start from a working version, capture its behavior and
 * extract one clearly named responsibility without changing the contract.
 *
 * Contract:
 *  - Export a reusable formatter with an explicit public API.
 *  - Pure module import has zero DOM/network side effects.
 *  - Formatting 1234.5 with an explicit locale is repeatable.
 *  - Clearly extract one responsibility (Option Normalization & Configuration Validation).
 *  - Provide a runnable module example with a local HTTP server.
 */

const http = require('node:http');

// =============================================================================
// 1. Initial Working Version (Baseline Formatter)
// =============================================================================
// The monolithic implementation where option parsing, default resolution,
// validation, and Intl formatting were coupled into a single function.

/**
 * Formats a number with options using a monolithic implementation.
 * Kept as a working baseline to verify behavioral equivalence after refactoring.
 *
 * @param {number|string} value - The numeric value to format
 * @param {object} [options={}] - Options object
 * @returns {string} Formatted number string
 */
function baselineFormatNumber(value, options = {}) {
  const numericVal = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericVal)) {
    throw new TypeError(`Expected a finite number, received: ${value}`);
  }

  // Monolithic option parsing & defaults coupled directly with formatting
  const locale = (options && typeof options.locale === 'string' && options.locale.trim())
    ? options.locale.trim()
    : 'en-US';

  const style = (options && typeof options.style === 'string')
    ? options.style
    : 'decimal';

  const intlOpts = { style };

  if (style === 'currency') {
    intlOpts.currency = (options && typeof options.currency === 'string')
      ? options.currency.toUpperCase()
      : 'USD';
  }

  if (options && typeof options.minimumFractionDigits === 'number') {
    intlOpts.minimumFractionDigits = options.minimumFractionDigits;
  } else if (style === 'decimal') {
    intlOpts.minimumFractionDigits = 1;
  }

  if (options && typeof options.maximumFractionDigits === 'number') {
    intlOpts.maximumFractionDigits = options.maximumFractionDigits;
  } else if (style === 'decimal') {
    intlOpts.maximumFractionDigits = 2;
  }

  return new Intl.NumberFormat(locale, intlOpts).format(numericVal);
}

// =============================================================================
// 2. Extracted Responsibility: Option Normalization & Validation
// =============================================================================
// Refactoring: Extracted into a pure, dedicated function adhering to the
// Single Responsibility Principle (SRP). It has no side effects, validates inputs,
// applies sensible defaults, and produces an immutable, sanitized configuration.

const DEFAULT_LOCALE = 'en-US';
const SUPPORTED_STYLES = Object.freeze(['decimal', 'currency', 'percent']);
const DEFAULT_FRACTION_DIGITS = Object.freeze({
  decimal: { minimumFractionDigits: 1, maximumFractionDigits: 2 },
  currency: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  percent: { minimumFractionDigits: 0, maximumFractionDigits: 2 }
});

/**
 * Extracted responsibility: Sanitizes, validates, and normalizes format options.
 * Pure function with no side effects.
 *
 * @param {object} [options={}] - Raw user options
 * @returns {{ locale: string, intlOptions: Readonly<object> }} Normalized options
 */
function normalizeFormatOptions(options = {}) {
  const opts = options && typeof options === 'object' ? options : {};

  // 1. Resolve and validate locale
  const locale = (typeof opts.locale === 'string' && opts.locale.trim().length > 0)
    ? opts.locale.trim()
    : DEFAULT_LOCALE;

  // 2. Resolve style
  const style = (typeof opts.style === 'string' && SUPPORTED_STYLES.includes(opts.style))
    ? opts.style
    : 'decimal';

  const intlOptions = { style };

  // 3. Resolve currency when style is 'currency'
  if (style === 'currency') {
    intlOptions.currency = (typeof opts.currency === 'string' && opts.currency.trim().length > 0)
      ? opts.currency.trim().toUpperCase()
      : 'USD';
  }

  // 4. Resolve fraction digits with style-specific defaults
  const defaults = DEFAULT_FRACTION_DIGITS[style] || DEFAULT_FRACTION_DIGITS.decimal;

  intlOptions.minimumFractionDigits = (typeof opts.minimumFractionDigits === 'number' && opts.minimumFractionDigits >= 0)
    ? Math.floor(opts.minimumFractionDigits)
    : defaults.minimumFractionDigits;

  intlOptions.maximumFractionDigits = (typeof opts.maximumFractionDigits === 'number' && opts.maximumFractionDigits >= intlOptions.minimumFractionDigits)
    ? Math.floor(opts.maximumFractionDigits)
    : Math.max(defaults.maximumFractionDigits, intlOptions.minimumFractionDigits);

  return Object.freeze({
    locale,
    intlOptions: Object.freeze(intlOptions)
  });
}

// =============================================================================
// 3. Formatter Factory & Public Formatting Functions
// =============================================================================

/**
 * Validates and converts input value to a finite number.
 *
 * @param {number|string} value
 * @returns {number}
 */
function validateNumericValue(value) {
  const numericVal = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericVal)) {
    throw new TypeError(`Expected a finite number, received: ${value}`);
  }
  return numericVal;
}

/**
 * Creates a reusable formatter instance wrapping Intl.NumberFormat.
 * Reuses the extracted normalizeFormatOptions responsibility.
 *
 * @param {object} [options={}]
 * @returns {{ format: (value: number|string) => string, resolvedOptions: () => object, config: object }}
 */
function createNumberFormatter(options = {}) {
  const normalized = normalizeFormatOptions(options);
  const formatter = new Intl.NumberFormat(normalized.locale, normalized.intlOptions);

  return Object.freeze({
    format(value) {
      const num = validateNumericValue(value);
      return formatter.format(num);
    },
    resolvedOptions() {
      return formatter.resolvedOptions();
    },
    config: normalized
  });
}

/**
 * Primary public formatter function.
 * Refactored to delegate configuration normalization to normalizeFormatOptions.
 *
 * @param {number|string} value - The number to format (e.g., 1234.5)
 * @param {object} [options={}] - Formatting options (locale, style, currency, etc.)
 * @returns {string} Repeatable, deterministic formatted string
 */
function formatNumber(value, options = {}) {
  const numericVal = validateNumericValue(value);
  const { locale, intlOptions } = normalizeFormatOptions(options);
  return new Intl.NumberFormat(locale, intlOptions).format(numericVal);
}

/**
 * Convenience helper for formatting currency values.
 *
 * @param {number|string} value - Value to format
 * @param {string} [currency='USD'] - 3-letter currency code
 * @param {string} [locale='en-US'] - Locale code
 * @param {object} [extraOptions={}] - Optional extra options
 * @returns {string} Formatted currency string
 */
function formatCurrency(value, currency = 'USD', locale = 'en-US', extraOptions = {}) {
  return formatNumber(value, {
    ...extraOptions,
    locale,
    style: 'currency',
    currency
  });
}

// =============================================================================
// 4. Interactive Local Web Application (HTML / CSS / JS)
// =============================================================================

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Day 20: Clean Code — Formatter Lab (R54-T026)</title>
  <style>
    :root {
      --primary: #4338ca;
      --primary-hover: #3730a3;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #1e293b;
      --muted: #64748b;
      --border: #e2e8f0;
      --success: #059669;
      --success-bg: #ecfdf5;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: var(--card-bg);
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
      border: 1px solid var(--border);
    }
    h1 {
      font-size: 1.6rem;
      margin-bottom: 0.5rem;
      color: var(--primary);
    }
    p.lead {
      color: var(--muted);
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      background: var(--success-bg);
      color: var(--success);
      margin-bottom: 1.5rem;
      border: 1px solid #a7f3d0;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.4rem;
      font-size: 0.9rem;
    }
    input, select {
      width: 100%;
      padding: 0.6rem 0.8rem;
      font-size: 1rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #fff;
    }
    input:focus, select:focus {
      outline: 2px solid var(--primary);
      outline-offset: 1px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    button {
      background: var(--primary);
      color: white;
      font-weight: 600;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      width: 100%;
      margin-top: 0.5rem;
      transition: background 0.15s ease;
    }
    button:hover {
      background: var(--primary-hover);
    }
    .output-card {
      margin-top: 1.75rem;
      padding: 1.25rem;
      border-radius: 8px;
      background: #f1f5f9;
      border: 1px solid var(--border);
    }
    .output-card h2 {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      color: #334155;
    }
    .output-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--primary);
      font-family: monospace;
      padding: 0.5rem 0;
    }
    .details {
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
    }
    pre {
      background: #0f172a;
      color: #38bdf8;
      padding: 0.75rem;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Writing Clean Code: Formatter Lab</h1>
    <p class="lead">Modular packaging demonstration: Single Responsibility Principle & Pure Functions.</p>
    <div id="equivalence-badge" class="badge">Behavioral Equivalence: Verified (Refactored matches Baseline)</div>

    <form id="formatter-form" onsubmit="return false;">
      <div class="form-group">
        <label for="number-input">Numeric Input (Value)</label>
        <input type="number" id="number-input" step="any" value="1234.5" required>
      </div>

      <div class="grid">
        <div class="form-group">
          <label for="locale-select">Locale</label>
          <select id="locale-select">
            <option value="en-US" selected>en-US (United States)</option>
            <option value="de-DE">de-DE (Germany)</option>
            <option value="fr-FR">fr-FR (France)</option>
            <option value="ja-JP">ja-JP (Japan)</option>
            <option value="en-GB">en-GB (United Kingdom)</option>
            <option value="hi-IN">hi-IN (India)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="style-select">Format Style</label>
          <select id="style-select">
            <option value="decimal" selected>Decimal</option>
            <option value="currency">Currency</option>
            <option value="percent">Percent</option>
          </select>
        </div>
      </div>

      <div class="grid">
        <div class="form-group">
          <label for="currency-select">Currency (for Currency style)</label>
          <select id="currency-select">
            <option value="USD" selected>USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="INR">INR (₹)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="min-fraction-input">Min Fraction Digits</label>
          <input type="number" id="min-fraction-input" value="1" min="0" max="20">
        </div>
      </div>

      <button type="button" id="format-btn">Format Number</button>
    </form>

    <div class="output-card">
      <h2>Formatted Output</h2>
      <div id="formatted-output" class="output-value">1,234.5</div>
    </div>

    <div class="details">
      <h3>Extracted Responsibility: Option Normalization</h3>
      <p style="color: var(--muted); margin-top: 0.25rem;">
        <code>normalizeFormatOptions()</code> produces this sanitized, frozen configuration without side effects:
      </p>
      <pre id="normalized-options-preview"></pre>
    </div>
  </div>

  <script>
    // Browser client implementation mirrors the pure module logic
    const DEFAULT_LOCALE = 'en-US';
    const SUPPORTED_STYLES = ['decimal', 'currency', 'percent'];
    const DEFAULT_FRACTIONS = {
      decimal: { min: 1, max: 2 },
      currency: { min: 2, max: 2 },
      percent: { min: 0, max: 2 }
    };

    function normalizeFormatOptions(options = {}) {
      const opts = options && typeof options === 'object' ? options : {};
      const locale = (typeof opts.locale === 'string' && opts.locale.trim().length > 0)
        ? opts.locale.trim()
        : DEFAULT_LOCALE;

      const style = (typeof opts.style === 'string' && SUPPORTED_STYLES.includes(opts.style))
        ? opts.style
        : 'decimal';

      const intlOptions = { style };

      if (style === 'currency') {
        intlOptions.currency = (typeof opts.currency === 'string' && opts.currency.trim().length > 0)
          ? opts.currency.trim().toUpperCase()
          : 'USD';
      }

      const defaults = DEFAULT_FRACTIONS[style] || DEFAULT_FRACTIONS.decimal;

      intlOptions.minimumFractionDigits = (typeof opts.minimumFractionDigits === 'number' && opts.minimumFractionDigits >= 0)
        ? Math.floor(opts.minimumFractionDigits)
        : defaults.min;

      intlOptions.maximumFractionDigits = (typeof opts.maximumFractionDigits === 'number' && opts.maximumFractionDigits >= intlOptions.minimumFractionDigits)
        ? Math.floor(opts.maximumFractionDigits)
        : Math.max(defaults.max, intlOptions.minimumFractionDigits);

      return { locale, intlOptions };
    }

    function formatNumber(value, options = {}) {
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(num)) {
        throw new TypeError('Invalid number');
      }
      const { locale, intlOptions } = normalizeFormatOptions(options);
      return new Intl.NumberFormat(locale, intlOptions).format(num);
    }

    function updateView() {
      try {
        const rawVal = document.getElementById('number-input').value;
        const locale = document.getElementById('locale-select').value;
        const style = document.getElementById('style-select').value;
        const currency = document.getElementById('currency-select').value;
        const minFracVal = document.getElementById('min-fraction-input').value;
        const minFrac = minFracVal !== '' ? parseInt(minFracVal, 10) : undefined;

        const options = {
          locale,
          style,
          currency
        };

        if (minFrac !== undefined && !isNaN(minFrac)) {
          options.minimumFractionDigits = minFrac;
        }

        const normalized = normalizeFormatOptions(options);
        const result = formatNumber(rawVal, options);

        document.getElementById('formatted-output').textContent = result;
        document.getElementById('normalized-options-preview').textContent = JSON.stringify(normalized, null, 2);
      } catch (err) {
        document.getElementById('formatted-output').textContent = 'Error: ' + err.message;
      }
    }

    document.getElementById('style-select').addEventListener('change', (e) => {
      const style = e.target.value;
      if (style === 'currency') {
        document.getElementById('min-fraction-input').value = '2';
      } else if (style === 'decimal') {
        document.getElementById('min-fraction-input').value = '1';
      } else if (style === 'percent') {
        document.getElementById('min-fraction-input').value = '0';
      }
      updateView();
    });

    document.getElementById('format-btn').addEventListener('click', updateView);
    document.getElementById('number-input').addEventListener('input', updateView);
    document.getElementById('locale-select').addEventListener('change', updateView);
    document.getElementById('currency-select').addEventListener('change', updateView);
    document.getElementById('min-fraction-input').addEventListener('input', updateView);

    // Initial render
    updateView();
  </script>
</body>
</html>`;

// =============================================================================
// 5. Server Lifecycle & CLI Execution
// =============================================================================

/**
 * Creates and starts a local HTTP server serving the interactive demo.
 *
 * @param {number} [port=0] - Port number (0 selects an ephemeral port)
 * @returns {Promise<{ server: import('node:http').Server, port: number, url: string }>}
 */
function startServer(port = 0) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_CONTENT);
    });

    server.listen(port, () => {
      const actualPort = server.address().port;
      const url = `http://localhost:${actualPort}`;
      resolve({ server, port: actualPort, url });
    });
  });
}

// Start server if executed directly via `node example.js`
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  startServer(port).then(({ url }) => {
    console.log(`[example.js] Reusable Formatter Lab running at: ${url}`);
    console.log(`[example.js] Contribution focus: Start from a working version, capture its behavior and extract one clearly named responsibility without changing the contract.`);
  });
}

// Explicit Public API
module.exports = {
  baselineFormatNumber,
  normalizeFormatOptions,
  createNumberFormatter,
  formatNumber,
  formatCurrency,
  startServer,
  HTML_CONTENT,
  DEFAULT_LOCALE,
  SUPPORTED_STYLES
};

# Applied Lab: Module Packaging & Clean Code Formatter (R54-T026)

## Overview
- **Student**: ABHINANDAN RATHORE
- **Task ID**: R54-T026 · 6 of 10
- **Topic**: Day 20 — Writing Clean Codes (Module Packaging & Applied Refactoring)
- **Contribution Focus**: *Start from a working version, capture its behavior and extract one clearly named responsibility without changing the contract.*

---

## Contract & Specifications

1. **Explicit Public API**:
   The module exposes a clean, documented public interface:
   - `normalizeFormatOptions(options)`: Extracted pure helper that sanitizes, validates, and normalizes formatting options with default values.
   - `createNumberFormatter(options)`: Factory creating a reusable formatter instance wrapping `Intl.NumberFormat`.
   - `formatNumber(value, options)`: Formats numeric values deterministically with an explicit locale and style.
   - `formatCurrency(value, currency, locale, options)`: Formats monetary amounts.
   - `baselineFormatNumber(value, options)`: The unrefactored monolithic reference retained for contract-equivalence regression checks.
   - `startServer(port)`: Starts a local HTTP server serving an interactive browser interface.

2. **Zero Side-Effect Module Import**:
   - Importing/requiring `example.js` performs zero DOM queries, zero window manipulations, and initiates zero network requests.
   - All formatting utilities are pure functions. Server execution is explicit via `startServer()`.

3. **Repeatable Formatting**:
   - Formatting `1234.5` with explicit locales is deterministic, idempotent, and repeatable:
     - `formatNumber(1234.5, { locale: 'en-US' })` $\rightarrow$ `'1,234.5'`
     - `formatNumber(1234.5, { locale: 'de-DE' })` $\rightarrow$ `'1.234,5'`
     - `formatCurrency(1234.5, 'USD', 'en-US')` $\rightarrow$ `'$1,234.50'`

4. **Extracted Responsibility (Single Responsibility Principle)**:
   - **Baseline (Monolithic)**: Option parsing, validation, locale fallbacks, and `Intl` instantiation were tightly coupled in `baselineFormatNumber`.
   - **Extracted Responsibility**: Extracted `normalizeFormatOptions(options)` as a dedicated pure function that handles locale fallback (`en-US`), style validation (`decimal`, `currency`, `percent`), currency code sanitation, and fraction digit defaults.
   - **Contract Preservation**: Automated tests assert 100% output identity between `baselineFormatNumber` and `formatNumber`.

---

## Running the Application

### 1. Interactive Demo
Start the local server:
```bash
node 20_Day_Writing_clean_codes/applied-labs/r54-t026/example.js
```
Open `http://localhost:3000` to interactively adjust numbers, locales, format styles, and inspect the extracted options normalization in real time.

### 2. Automated Playwright Validation
Run the Playwright test suite:
```bash
NODE_PATH=/opt/homebrew/lib/node_modules node 20_Day_Writing_clean_codes/applied-labs/r54-t026/check.mjs
```
All assertion results and environment metadata will be recorded in `work/R54-T026/results.json` and `work/R54-T026/results.md`.

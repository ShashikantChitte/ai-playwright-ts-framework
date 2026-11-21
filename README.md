# Playwright Test Architecture (TypeScript): Web + API

Playwright framework for **https://shop.qaautomationlabs.com** (UI) and the QA Automation Labs REST API
(`https://testing.qaautomationlabs.com/api/v1`).

Page Objects + fixtures, typed API client, **self-healing locators**, **AI-assisted test generation**,
**flaky-test detection**, cross-browser sharded CI, Docker, Azure DevOps, Kubernetes.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 or newer | Developed on Node 22; Node 24 is expected to work. No `nvm` needed if you already have Node 20+. |
| npm | 10+ | Ships with Node |
| Docker Desktop | optional | Only for the Docker route; start it and wait until it reports "running" |

This is a Node project, so there is no Python `venv`. The isolated environment is the project-local
`node_modules/` created by `npm install`.

---

## 2. Run locally

### Windows (cmd)

```bat
cd C:\Users\<you>\GitRepos\playwright-ecommerce-framework

npm install
npx playwright install
copy .env.example .env

npm run typecheck
npm run test:unit
npm run test:chromium
npm run report
```

### macOS / Linux
```bash
npm install
npx playwright install --with-deps     # --with-deps installs OS libraries (Linux)
cp .env.example .env

npm run typecheck
npm run test:unit
npm run test:chromium
npm run report
```

> `--with-deps` is Linux-only. On Windows and macOS use plain `npx playwright install`.

### Windows fix for two npm scripts (one-time)

`test:api:mock` and `test:quarantine` set environment variables inline, which works on Linux/macOS but not in
Windows cmd. Install `cross-env`:
```bat
npm install -D cross-env
```
Then change these two lines in `package.json`:
```json
"test:api:mock": "cross-env API_BASE_URL=http://localhost:4010/api/v1 playwright test --project=api",
"test:quarantine": "cross-env RUN_QUARANTINE=true playwright test --grep @quarantine",
```

### Try the API suite without the real API (local mock)

Two terminals:

```bat
:: terminal 1
npm run mock:api

:: terminal 2 (cmd)
set API_BASE_URL=http://localhost:4010/api/v1
npm run test:api
```
(PowerShell: `$env:API_BASE_URL="http://localhost:4010/api/v1"`. macOS/Linux: `API_BASE_URL=... npm run test:api`.)

---

## 3. Run in Docker

The image bundles the browsers, so `npx playwright install` is not needed.

```bat
copy .env.example .env
docker compose build
docker compose run --rm tests test:smoke -- --project=chromium
```

Without Compose:
```bat
docker build -t pw-framework .
docker run --rm --ipc=host --env-file .env -v "%cd%\test-results:/app/test-results" pw-framework test:smoke
```
(PowerShell: use `${PWD}` instead of `%cd%`. macOS/Linux: `$(pwd)`.)

### Why the Docker run looks quiet
The image sets `CI=true`, which switches the config to the **`dot`**, **blob**, **JUnit** and **JSON** reporters.
You see a line of dots (or nothing) until the end, and **no HTML report is produced**. A run that is still going
is therefore easy to mistake for a hang.

| You want | Command |
|---|---|
| Live per-test progress and an HTML report | `docker compose run --rm -e CI=false tests test:smoke -- --project=chromium` then open `playwright-report\index.html` |
| Keep CI mode, build the HTML report afterwards | `npx playwright merge-reports --reporter html .\blob-report` (needs a local `npm install`) |
| JUnit / JSON for pipelines | `test-results\junit.xml`, `test-results\results.json` |

`test:smoke` without `--project` runs every browser project (Chromium, Firefox, WebKit, mobile Chrome) plus the API
project, which takes much longer. Add `-- --project=chromium` while you are getting set up.

### Using the mock API in Docker

```bat
docker compose --profile mock up -d mock-api
docker compose run --rm -e API_BASE_URL=http://mock-api:4010/api/v1 tests test:api
docker compose --profile mock down
```

---

## 4. Commands

| Command | Purpose |
|---|---|
| `npm test` | All gating projects: chromium, firefox, webkit, mobile-chrome, api |
| `npm run test:smoke` | Tests tagged `@smoke` |
| `npm run test:chromium` / `test:headed` / `test:ui` | Fast local loop / visible browser / Playwright UI mode |
| `npm run test:api` / `test:unit` | API suite / framework self-tests (no browser) |
| `npm run test:quarantine` | Run `@quarantine` tests (excluded from normal runs) |
| `npm run ai:generate -- --url=<page> [--discover] [--goal="..."]` | Generate a spec from a live page (LLM if `ANTHROPIC_API_KEY` is set, otherwise a heuristic generator) |
| `npm run ai:generate-api -- --spec=<openapi.json or url>` | Contract tests from an OpenAPI file (deterministic) |
| `npm run ai:healing` | Which locators self-healed and what to promote |
| `npm run ai:flaky [-- --fail-on-flaky]` | Score flakiness history; optional quality gate |
| `npm run ai:triage` | Group failures by likely root cause (LLM diagnosis if a key is set) |
| `npm run report` | Open the HTML report (local, non-CI runs) |

---

## 5. Project layout

```typeScript
src/config      zod-validated env (fails fast)        src/core     logger, self-healing, flaky analysis
src/pages       Page Objects + locator registry        src/api      ApiClient, AuthApi, ResourceApi, schemas
src/fixtures    composed `test` (pages, api, healer)   src/ai       LLM client, healing advisor, page scanner
src/data        unique test-data factories             reporters/   flaky-test reporter
tests/web | e2e | api | unit | generated               scripts/     AI + analysis CLIs, mock API server
Dockerfile, docker-compose.yml, azure-pipelines.yml, .github/workflows, k8s/
```

See `docs/ARCHITECTURE.md` for design decisions, standards, governance and AI risk controls.

---

## 6. Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://shop.qaautomationlabs.com` | UI target |
| `API_BASE_URL` | `https://testing.qaautomationlabs.com/api/v1` | API target |
| `SHOP_USER_EMAIL` / `SHOP_USER_PASSWORD` | `demo@demo.com` / `demo` | UI login |
| `API_USER_EMAIL` / `API_USER_PASSWORD` | `qa@demo.io` / `Password123` | API login |
| `WORKERS`, `RETRIES`, `HEADLESS`, `TRACE` | see `.env.example` | Execution tuning |
| `EXTRA_HTTP_HEADERS` | empty | JSON of headers, e.g. an allow-list token agreed with the site owner |
| `HEALING_ENABLED`, `HEALING_GRACE_MS`, `HEALING_TIMEOUT_MS` | on / 1500 / 5000 | Self-healing behaviour |
| `ANTHROPIC_API_KEY`, `AI_MODEL` | empty | Optional LLM features |

Never commit real secrets. In CI use an Azure DevOps variable group linked to Key Vault.

---

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `BlockedByBotProtectionError` or page title "Just a moment..." | The shop sits behind a Cloudflare challenge. Run from a network the site accepts, try `npm run test:headed`, or use `EXTRA_HTTP_HEADERS` if the owner provides a token. This is the site blocking automation, not a framework bug. |
| `Element "..." not found ... Tried: primary / fallback ...` | Locators are unverified guesses. Run `npm run ai:generate -- --url=https://shop.qaautomationlabs.com --discover`, then put the real `data-testid` values first in `src/pages/locators.ts`. |
| API tests fail with 404 or missing token | `src/api/endpoints.ts` holds assumed paths. Download the OpenAPI spec and run `ai:generate-api`, then fix the paths. |
| `'nvm' is not recognized` (Windows) | Not needed. Check `node -v` (20 or newer). For multiple versions use `nvm-windows`. |
| `cp` or `API_BASE_URL=...` fails in cmd | Use `copy` and `set`, or install `cross-env` (section 2). |
| Docker build cannot find the Playwright image | The tag `mcr.microsoft.com/playwright:v1.65.1-noble` must match `@playwright/test` in `package.json`; change the `PLAYWRIGHT_VERSION` ARG if you upgrade. |
| Chromium crashes in Docker | Keep `ipc: host` / `--ipc=host` (already set in `docker-compose.yml`). |
| Docker run shows no progress | Expected with `CI=true`; see "Why the Docker run looks quiet" above. |

---

## 8. What is and is not verified

Verified in the build sandbox (Linux, Node 22): `tsc --strict` and ESLint clean; 38 tests list correctly; the
**unit suite (4) and API suite (5) pass**, the API suite against the bundled mock server. That run exercised the
fixtures, worker-scoped login, base-path handling, the flaky reporter and the analyzer. The OpenAPI generator's
output type-checks. The Docker image builds on your machine.

**Not verified; check on your side:**

1. **Web locators.** The shop was not driven in a browser (Cloudflare challenge). Locators come from the public sign-in page text and use fallbacks; promote real `data-testid`s as described above.
2. **API paths and payloads.** The OpenAPI host blocks automated fetching, so endpoints and the mock are assumptions.
3. **Azure DevOps, Kubernetes and GitHub Actions YAML** follow standard patterns but were not executed.
4. **LLM-backed features** (`ANTHROPIC_API_KEY`) were type-checked but not run against the live API.

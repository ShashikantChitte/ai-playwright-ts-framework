# Architecture, standards & governance

## 1. Layers (dependencies point downward only)
`tests` → `fixtures` → `pages` / `api` → `core` (healing, logger, flaky) → `config`.
Tests never touch raw locators or raw HTTP; pages never assert business rules beyond their own state.

## 2. Key design decisions
| Decision | Why |
|---|---|
| Fixtures over base classes | Lazy, composable, per-test isolation; API tests never launch a browser |
| Locator registry with ordered strategies | One edit point; enables self-healing and drift reporting |
| Project dependencies for auth (`setup`) | Login once, reuse `storageState`; login tests opt out explicitly |
| `fullyParallel` + unique data factories | Speed without shared-state collisions |
| Blob reporter in CI + merge job | Correct HTML report across shards/agents |
| Pinned Playwright image + exact version | Reproducible browsers locally, in Docker and in CI |
| zod-validated config | Misconfiguration fails in one clear message |

## 3. Self-healing locators (src/core/selfHealing.ts)
Order: cached winner → primary (gets a grace period so slow pages don't cause false heals) → fallbacks (must match
exactly 1 element) → optional LLM suggestion (schema-validated, re-verified). Every heal is logged, annotated on the
test, and aggregated by `npm run ai:healing`. **A heal is a maintenance ticket, not a pass to ignore**: promote the
fallback to primary. Healing never masks a missing element — if nothing matches, the test fails listing all attempts.

## 4. Flaky-test management
Reporter records each attempt → `test-results/flaky/run-*.json`; `ai:flaky` merges into a 30-run rolling history,
scores `(flaky runs + pass/fail flips) / runs`, classifies stable / suspect / flaky / broken and buckets the likely
cause (timing, strict-mode, detached element, network, rate-limit, bot-protection, data/state, assertion).
Policy: flaky → tag `@quarantine` within 1 working day (excluded from gating, still run by `test:quarantine`),
owner fixes within the sprint, then remove the tag. Turn on `--fail-on-flaky` once the suite is clean.

## 5. AI-assisted testing — risk controls
- Opt-in only (`ANTHROPIC_API_KEY`); every feature has a non-AI fallback.
- Generated specs land in `tests/generated`, a separate `generated` project, and need human review before promotion.
- LLM output is schema-validated and re-verified against the page; it can never silently turn a failure into a pass.
- Page content and error text are treated as untrusted (prompt-injection) and never executed.
- DOM/ARIA snapshots are sent to the API: do not enable against environments showing real personal data.

## 6. Standards
- Files: `Thing.spec.ts`, `ThingPage.ts`, `thing.factory.ts`. Test titles read as behaviour ("rejects invalid password").
- Tags: `@smoke` (<10 min gate), `@regression`, `@e2e`, `@api`, `@security`, `@quarantine`.
- Locators: role/label → `data-testid` → CSS (last resort). No XPath, **no `waitForTimeout`** (lint-enforced).
- Assertions: web-first / `expect.poll`; API tests assert status, content-type, schema and latency budget.
- Secrets only via env / Key Vault variable groups; never in the repo.

## 7. PR checklist
Typecheck + lint + unit green · new elements added to `locators.ts` with fallbacks · data unique per test ·
no hard waits · tags set · README/ARCHITECTURE updated if a convention changed.

## 8. CI/CD on Azure DevOps
Quality (lint/types/unit) → Test (4 shards × all projects, in the Playwright container, JUnit published) →
Report (merge blob reports → HTML, flaky analysis with cached history, optional upload to an Azure Blob static
site). PRs run `@smoke`; the nightly schedule runs everything. Secrets come from a Key Vault-linked variable group.
Same npm scripts + image work for Jenkins/GitLab; `k8s/playwright-job.yaml` runs shards as an Indexed Job on AKS.
For AWS/GCP swap blob upload for S3/GCS and the job runner for EKS/GKE — the container is cloud-neutral.

## 9. Roadmap
Visual regression (`toHaveScreenshot`) baselines · k6/JMeter perf jobs · accessibility checks with axe ·
Allure/Slack notifications · contract tests via Pact · test-impact analysis to shorten PR runs.

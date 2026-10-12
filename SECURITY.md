# Security Policy & Production Hardening Guide — SpecDiff

## 1. Security Overview

SpecDiff is engineered with a **defense-in-depth** model. All input validation, authorization, and constraint checking occur strictly on the backend. The platform enforces a **Default-to-Deny** security architecture across all administrative endpoints, catalog mutation APIs, and file ingestion pathways.

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability or weakness within SpecDiff:
1. **Do not create a public GitHub issue.**
2. Send an email to the security response team at `security@specdiff.in` (or contact the primary repository maintainer).
3. Include detailed reproduction steps, target URLs, sample payloads, and expected vs. actual impact.
4. The maintainer team will acknowledge receipt within 24 hours and issue a CVE/patch within 72 hours for critical vulnerabilities.

---

## 3. Configuration & Secrets Management

### Secrets Isolation Rules
1. **Never commit `.env` or plaintext secrets**: The `.gitignore` file includes `.env`, `.env.*`, and `*.pem`/`*.key`.
2. **Fail-Fast Schema Validation**: On backend startup, `AppEnvironmentSettings` validates all required parameters via Pydantic v2. In `ENVIRONMENT=production`, if `ADMIN_API_KEY` is omitted, shorter than 16 characters, or matches the development placeholder `specdiff_admin_secret_key_2026`, **the application refuses to boot** (`SystemExit`).
3. **No Secret Leaks to Client Bundles**: Frontend components access backend endpoints using dynamic session storage or secure headers. No secret keys or master tokens are embedded in frontend source bundles (`api.js`).

### Environment Profiles

| Variable | Development | Staging | Production | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | `staging` | `production` | Deployment environment profile |
| `ADMIN_API_KEY` | *(Local dev placeholder)* | `stg_sec_...` (min 32 chars) | `prod_sec_...` (high entropy) | Secret key protecting `/api/admin/*` and mutation APIs |
| `DATABASE_URL` | `sqlite:///smartpick.db` | `postgresql+asyncpg://...` | `postgresql+asyncpg://...` | Database connection URL |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | `https://staging.specdiff.in` | `https://specdiff.in` | Explicit CORS allowlist (wildcard with credentials forbidden) |
| `REDIS_URL` | `redis://localhost:6379/0` | `redis://stg-cache:6379/0` | `rediss://prod-cache:6379/0` (TLS) | Two-tier query & rate-limit cache |
| `RATE_LIMIT_RECOMMEND`| `30/minute` | `15/minute` | `15/minute` | Rate limit for 5-factor recommendation queries |
| `RATE_LIMIT_COPILOT`  | `30/minute` | `20/minute` | `20/minute` | Rate limit for GPU / Gemini LLM copilot queries |
| `GEMINI_API_KEY` | *(Optional)* | *(Staging Key)* | *(Prod Key with spend cap)* | Google Generative AI API Key |

---

## 4. Authentication, Authorization & RBAC

1. **Administrative Endpoints (`/api/admin/*`, `PATCH /api/products/{id}/stock`)**:
   - Protected by `verify_admin_key` dependency.
   - Accepts either `X-Admin-Key: <key>` or `Authorization: Bearer <key>`.
   - Compares candidate keys against `ADMIN_API_KEY` using `hmac.compare_digest` to prevent side-channel timing attacks.
   - Logs every successful and failed authorization attempt with client IP, timestamp, and target endpoint (`[AUTH_SUCCESS]`, `[AUTH_FAILURE]`).
2. **Least Privilege**:
   - Public read operations (`GET /api/products`, `POST /api/recommend`, `POST /api/compare`) require no administrative credentials.
   - Any state-altering mutation (CSV ingestion, stock modification, vector re-indexing) requires verified administrative credentials.

---

## 5. Input Validation, Request Safety & Injection Defense

1. **Schema Validation**: Every endpoint enforces strict Pydantic v2 schemas (`RecommendationRequest`, `CompareRequest`, `CopilotRequest`, `FeedbackRequest`, `ClickTrackRequest`). Unknown or excessive payload fields are rejected.
2. **Formula Injection (CWE-1236) Defense**:
   - CSV catalog uploads are sanitized using `sanitize_cell`.
   - Cells beginning with formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with a leading single quote (`'`), preventing remote code execution when opened in Excel or Google Sheets.
3. **Open Redirect Defense**:
   - Outbound click tracker (`POST /api/track/click`) validates URL format and allows only `http` and `https` schemes with valid network locations, rejecting `javascript:`, `data:`, or relative file exploits.
4. **XSS & Content Sanitization**:
   - User feedback comments are stripped of HTML tags (`<script>`, `<iframe>`, etc.) using regex and whitespace normalization.
5. **Security Headers**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(), camera=(), microphone=()`
   - `X-XSS-Protection: 1; mode=block`
   - In production: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

---

## 6. Abuse Prevention & Cost Control

1. **IP-Keyed Rate Limiting (`slowapi`)**:
   - `/api/recommend`: `15/minute`
   - `/api/copilot`: `20/minute` (prevents AI token and GPU exhaustion)
   - `/api/feedback`: `30/minute`
   - `/api/track/click`: `60/minute`
   - `/api/admin/catalog/upload`: `10/minute`
2. **File Size Boundaries (DoS Defense)**:
   - Request bodies capped at 15MB at the middleware layer (HTTP 413).
   - CSV catalog uploads stream in 64KB chunks up to a hard 10MB ceiling (HTTP 413).
3. **Memory Exhaustion Defense**:
   - Background catalog upload registry capped at 100 historical jobs (LRU eviction).
   - In-memory recommendation cache fallback capped at 1,000 entries (LRU eviction).

---

## 7. Telemetry & Privacy (GDPR-Friendly)

1. **IP Anonymization**: Outbound click and audit telemetry anonymizes client IPs (`192.168.1.xxx` for IPv4, masked subnet for IPv6).
2. **Request ID Tracing**: Every inbound request is assigned a UUID (or inherits `X-Request-ID`), attached to `request.state.request_id`, and echoed in the response header `X-Request-ID`.
3. **No Stack Traces in Production**: Unhandled server errors (HTTP 500) return a sanitized response `{ "detail": "...", "request_id": "<uuid>" }` without leaking file paths or exception tracebacks to clients.

---

## 8. Deployment & Rollback Procedure

### Deploying to Production
1. Set `ENVIRONMENT=production` in production environment / secret manager.
2. Provide a 32+ character random `ADMIN_API_KEY` (e.g., `openssl rand -base64 32`).
3. Run database migrations or verify schema:
   ```bash
   python -m alembic upgrade head
   ```
4. Run automated test suite:
   ```bash
   pytest -v
   ```
5. Deploy backend container / service behind Nginx or Cloudflare with TLS termination.

### Rollback Procedure
If a regression or vulnerability is detected after deployment:
1. Revert container image or Git commit to the previous stable release tag:
   ```bash
   git checkout <last-stable-tag>
   ```
2. Invalidate cache:
   ```bash
   redis-cli FLUSHDB
   ```
3. Restart application service.
4. Verify health and readiness probes:
   ```bash
   curl -I https://api.specdiff.in/api/ready
   ```

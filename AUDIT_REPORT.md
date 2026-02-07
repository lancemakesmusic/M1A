M1A Audit Report
Date: 2026-01-29
Scope: frontend (React Native/Expo), backend (FastAPI), Google Drive integration,
wallet/hours system, messaging, logging/observability, and recent security changes.

Executive Summary
- Overall work is moving in the right direction: better security posture, more
  consistent logging, and fixes for known Firestore index errors and message
  loading loops.
- Two material risks remain: Google Drive access control can be bypassed if a
  user's folder ID is missing, and the "intro video gating" can deadlock app
  startup due to looping playback.
- No automated tests were added; regression risk is still significant, especially
  for payments, wallet hours, and Google Drive flows.

Scorecard (1-10)
1) Security: 6/10
   - Improvements: JWT secret required, idempotency added, path traversal blocked.
   - Gaps: Drive access controls allow file listing/downloading without a stored
     folder ID; client-side folder ID writes are not server-validated.
2) Data Integrity: 6/10
   - Improvements: Firestore transactions for wallet/hours; webhook idempotency.
   - Gaps: webhook idempotency is non-atomic; wallet hours update flow is not
     fully consistent when hours are insufficient; no compensating actions.
3) Reliability/Stability: 6/10
   - Improvements: message loading loop fixed; loading fallback in video intro.
   - Gaps: intro video gating can deadlock if "didJustFinish" never fires.
4) Performance/Scale: 5/10
   - Improvements: reduced Firestore index errors by in-memory aggregation.
   - Gaps: in-memory filtering can become expensive at scale; tab preloading
     increases memory usage; in-memory rate limit is per-process only.
5) UX: 7/10
   - Improvements: intro video + chat bubble gating and animation; dashboard hours.
   - Gaps: intro video can block login if playback never completes or fails.
6) Maintainability: 7/10
   - Improvements: centralized API config and sanitize utilities; logging cleanup.
   - Gaps: many changes are broad; few tests or docs for new flows.
7) Observability: 6/10
   - Improvements: consistent logger usage; explicit error messages.
   - Gaps: no structured error codes or correlation IDs across services.
8) Test Coverage/QA: 3/10
   - No new automated tests for the changed flows (wallet hours, Drive, payments).
9) Release Readiness: 5/10
   - Requires Drive security fix, intro video gating fix, and basic regression tests.
10) Ops/Config Hygiene: 6/10
   - Improvements: required secrets enforced; .env template updated.
   - Gaps: service account permissions still block backfill; env validation not
     centralized.

Detailed Findings

Critical
1) Google Drive access control bypass if folder ID is missing
   - Impact: A user without a stored folder ID can supply any folderId and list
     or download files that the service account can access.
   - Evidence: if stored folder ID is missing, list_files falls back to the
     request's folderId. The access check for downloads allows access when
     folder_id is None.
   - Fix: Require a stored folder ID before listing/downloading, or enforce a
     strict mapping of user -> folderId and return 403 if missing.

High
2) Intro video gating can block app startup
   - Impact: If the video is set to loop, "didJustFinish" may never fire and the
     app remains on the loading screen.
   - Fix: Set isLooping to false, or gate on a timeout / duration check.
3) Client-side Drive folder ID update is not server-validated
   - Impact: If Firestore rules permit, users can point googleDriveFolderId to
     arbitrary folders, bypassing data segregation.
   - Fix: Move folder ID updates server-side only; enforce Firestore rules to
     prevent client writes to drive IDs.

Medium
4) Stripe webhook idempotency is not atomic and unbounded
   - Impact: On concurrent delivery across instances, events can be double-
     processed. Stored events grow unbounded.
   - Fix: Use Firestore transaction/conditional create, and add TTL or cleanup.
5) Wallet hours update transaction update-after-set risk
   - Impact: On a new wallet document, update in the same transaction can fail
     depending on Firestore transaction semantics.
   - Fix: Use transaction.set(..., merge=True) for the update block instead.
6) Tab preloading increases memory usage
   - Impact: Potential performance/memory regression on low-end devices.
   - Fix: Consider conditional preloading (e.g., only when memory allows).
7) API base URL defaults to localhost
   - Impact: If EXPO_PUBLIC_API_BASE_URL is not set on device builds, API calls
     fail because localhost points to the device itself.
   - Fix: Enforce env config for all non-web builds, or infer LAN IP for dev.
8) Drive folder creation attempt marked as "ensured" before success
   - Impact: If creation fails (timeout/network), it will not retry in the same
     session, leaving the user without folder IDs.
   - Fix: Only add to ensuredDriveFoldersRef after a successful response.
9) Input sanitization is minimal
   - Impact: The current sanitizeText/remove < > is basic and does not cover
     other injection or formatting concerns.
   - Fix: Use stricter allowlists or a proven sanitizer for any HTML contexts.

Low
10) In-memory rate limiting is per-process only
   - Impact: Ineffective under multiple instances or restarts.
   - Fix: Use a shared store (Redis) or gateway rate limit.
11) Extensive logging changes without structured context
   - Impact: Harder to correlate across services.
   - Fix: Add request IDs and include them in logs.

Recommended Next Actions (Priority Order)
1) Lock down Drive access:
   - Require stored folder IDs for all Drive file operations.
   - Block folderId query parameter when stored ID is missing.
2) Fix intro gating:
   - Disable looping or add a max timeout fallback.
3) Move Drive ID writes to backend:
   - Prevent client from mutating Drive IDs.
4) Make webhook idempotency atomic:
   - Use transaction or create-with-precondition; add TTL cleanup.
5) Add smoke tests:
   - Wallet hours purchase/deduct, Drive listing, and payments webhook flow.

Appendix: Evidence Excerpts
- Google Drive access checks allow folder_id None:
  - is_file_in_user_folder returns true when folder_id is missing.
  - list_files uses request folderId if stored folderId is missing.
- Intro video uses isLooping and didJustFinish for gating.
- API base URL defaults to localhost without env override.
- Wallet hours transaction uses update after set.
- Stripe webhook idempotency uses non-transactional create.

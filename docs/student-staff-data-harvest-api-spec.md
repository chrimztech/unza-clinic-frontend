# Request: Student & Staff Data Feed for UNZA Clinic Management System

**From:** Chrishent Mutondo Matondo — UNZA Clinic Management System
**To:** [Developer / System Owner name]
**Date:** 2026-07-13

## 1. What we're asking for

The UNZA Clinic Management System needs to keep its patient register in sync with:

1. **Staff records** — from the HR system (one source).
2. **Student records** — from the student information system(s). We understand students live across **more than one database/instance** (e.g. per school/campus) — please confirm exactly how many instances and their base URLs in your reply.

We are **not** asking you to push data to us. Our backend will **pull (harvest) data on a schedule** (e.g. nightly) by calling read-only endpoint(s) that you expose. We just need you to build and expose those endpoints, documented below, and give us credentials to call them.

## 2. Integration pattern

- **Direction:** Clinic backend → your endpoint (we call you; you don't call us).
- **Frequency:** Scheduled pull, e.g. once nightly, plus the ability for us to trigger an on-demand pull manually.
- **Sync style:** Incremental — every record must carry a `last_modified` (or `updated_at`) timestamp so we can request only records changed since our last successful pull (`?updated_since=2026-07-12T02:00:00Z`), instead of re-downloading the full dataset every time.
- **Format:** JSON over HTTPS.
- **Pagination:** Required for both feeds — see §5.
- **Auth:** See §4.

## 3. Data we need

We only need **identity, biodata and enrolment/employment fields** — nothing clinical. Medical data (allergies, blood group, conditions, etc.) is captured by us and does not need to come from you.

### 3.1 Student feed — required fields

| Field | Type | Notes |
|---|---|---|
| `student_number` | string | Computer number — this is our unique key for matching/de-duplicating a student. |
| `national_id_or_passport` | string | Optional but useful as a secondary match key. |
| `first_name` | string | |
| `middle_name` | string | Optional |
| `last_name` | string | |
| `date_of_birth` | string (ISO 8601, `YYYY-MM-DD`) | |
| `gender` | string | `MALE` / `FEMALE` (please confirm your enum) |
| `email` | string | |
| `phone` | string | |
| `address` | string | Residential address / township |
| `school` | string | e.g. "School of Engineering" |
| `program` | string | Programme of study |
| `year_of_study` | integer | |
| `hostel` | string | Optional — residence, if boarding |
| `enrolment_status` | string | `ACTIVE`, `SUSPENDED`, `GRADUATED`, `WITHDRAWN` — so we can stop treating graduated/withdrawn students as current patients |
| `last_modified` | string (ISO 8601 datetime) | **Required** — drives incremental sync |

### 3.2 Staff feed — required fields

| Field | Type | Notes |
|---|---|---|
| `staff_number` ("man number") | string | Our unique key for matching staff. |
| `first_name` | string | |
| `middle_name` | string | Optional |
| `last_name` | string | |
| `date_of_birth` | string (ISO 8601) | |
| `gender` | string | |
| `email` | string | |
| `phone` | string | |
| `address` | string | |
| `department` | string | |
| `position` / `job_title` | string | |
| `employment_status` | string | `ACTIVE`, `RETIRED`, `TERMINATED` — so we can stop treating former staff as current patients |
| `dependents` | array (optional) | If available: spouse/children with `full_name`, `relationship`, `date_of_birth` — used to pre-populate `STAFF_DEPENDANT` patients. If not available from HR, we'll capture these manually and this field can be omitted. |
| `last_modified` | string (ISO 8601 datetime) | **Required** — drives incremental sync |

## 4. Authentication

Please use one of (in order of preference):

1. **OAuth2 client-credentials** — we request a token from a `/token` (or similar) endpoint using a client id/secret, then send `Authorization: Bearer <token>` on subsequent calls.
2. **Service account login + token** — a login endpoint that accepts a service username/password and returns a short-lived token (e.g. 1 hour) we refresh automatically. This mirrors a pattern we already use for another UNZA integration (counselling services), so it's a known-good fit for us.
3. **Static API key** (least preferred, only if the above aren't practical) — sent as `Authorization: ApiKey <key>` or a custom header, over HTTPS only.

Whichever you choose, please issue us **separate credentials for staging/test and production**, and confirm token expiry / rotation policy.

## 5. Endpoint shape (suggested — happy to adapt to your conventions)

```
GET /api/v1/students?updated_since={ISO8601}&page={n}&page_size={n}
GET /api/v1/staff?updated_since={ISO8601}&page={n}&page_size={n}
```

Suggested response envelope:

```json
{
  "page": 1,
  "page_size": 200,
  "total_pages": 14,
  "total_records": 2731,
  "data": [
    {
      "student_number": "2022457990",
      "first_name": "Test",
      "middle_name": "",
      "last_name": "Student",
      "date_of_birth": "2003-05-01",
      "gender": "MALE",
      "email": "test.student@unza.zm",
      "phone": "0977123456",
      "address": "Great East Road Campus",
      "school": "School of Engineering",
      "program": "BEng Civil Engineering",
      "year_of_study": 3,
      "hostel": "",
      "enrolment_status": "ACTIVE",
      "last_modified": "2026-07-10T08:14:00Z"
    }
  ]
}
```

If you already have an existing endpoint with a different shape, that's fine — send us the schema and we'll map it on our side. We're flexible on structure; the two hard requirements are **pagination** and a **`last_modified`/`updated_at` timestamp per record** for incremental sync.

## 6. Multiple student database instances

Since students are split across separate databases/instances, please reply with:

- How many instances exist, and what distinguishes them (campus, school, intake year, etc.)?
- Base URL and credentials for each instance.
- Whether all instances will use the **same** response schema (strongly preferred — makes our integration much simpler), or if they differ.
- Whether there's a single aggregating endpoint you could put in front of them instead (ideal, if feasible on your side).

## 7. Non-functional requirements

- **HTTPS only.**
- **Rate limits** — let us know if there's a cap on requests/min so our scheduler respects it.
- **Error responses** — standard HTTP status codes with a JSON error body (`{ "error": "...", "message": "..." }`) is fine.
- **Sandbox/test environment** — a staging endpoint with sample/dummy records would help us build and test the sync job before touching production data.
- **Data ownership** — we will only store the fields listed in §3; please flag if any of those fields are restricted/sensitive on your side and shouldn't be shared.

## 8. What we'll build on our side

Once the above is available, our backend (Spring Boot) will run a scheduled job that calls your endpoint(s), maps the response into our `Patient` records (matched by `student_number` / `staff_number`), and creates/updates patients accordingly. New records become `STUDENT` / `STAFF` patients automatically; we do not need write access to your systems — read-only is all we require.

---

**Questions for you to answer in your reply:**

1. Which auth method (§4) will you provide?
2. Can staff and student feeds share the same response schema/pagination style?
3. How many student database instances exist, and can they be unified behind one endpoint?
4. Is a `last_modified`/`updated_at` field available on existing records, or would this need to be added?
5. Any fields in §3 you *cannot* provide, and any additional fields you'd recommend we include?
6. Rate limits and preferred call schedule?
7. Timeline for a staging/sandbox endpoint we can start testing against?

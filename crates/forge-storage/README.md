# forge-storage

`forge-storage` persists a user's calendars, event definitions, recurrence rules, and exceptions in SQLite or PostgreSQL. The caller supplies an authenticated user ID to `Storage::for_user`; every calendar and event operation is scoped to that user.

```rust,no_run
use chrono::NaiveDate;
use forge_storage::{EventTime, NewEvent, Storage};

# async fn example() -> Result<(), Box<dyn std::error::Error>> {
let storage = Storage::connect("sqlite::memory:").await?;
let user = storage.for_user("user-123")?;
let calendar = user.create_calendar("Personal", "America/Detroit").await?;
let event = user.create_event(&calendar.id, NewEvent {
    title: "Holiday".into(),
    description: None,
    location: None,
    time: EventTime::AllDay {
        start: NaiveDate::from_ymd_opt(2026, 12, 25).unwrap(),
        end_exclusive: NaiveDate::from_ymd_opt(2026, 12, 26).unwrap(),
    },
}).await?;
assert_eq!(user.get_event(&event.id).await?, Some(event));
storage.close().await;
# Ok(())
# }
```

## Stored model

- `calendars` has a user owner, a name, and an IANA time zone.
- `events` stores the calendar parent and descriptive fields. Its required one-to-one `event_times` row stores either UTC instants plus an IANA time zone or all-day dates. Ends are exclusive.
- `event_recurrence` holds an RRULE and a typed local start or start date.
- `event_exceptions` holds cancellations or replacement details, keyed by a typed original occurrence start. A replacement has a one-to-one `event_exception_times` row. Deleting a calendar or series cascades to its children.

SeaORM manages persistence and versioned Rust migrations. There are no database `CHECK` constraints: Rust validates writes and checks the shape of rows it reads. Related rows are written in transactions. `Storage::connect` accepts `sqlite:`, `postgres:`, or `postgresql:` URLs. SQLite file URLs need `?mode=rwc` to create a missing file; `sqlite::memory:` is supported. Timed instants have millisecond precision. Rule strings are stored as supplied after a nonempty check. The crate stores series definitions and exceptions but does not expand recurring instances or import ICS feeds yet.

The SeaORM schema replaces the earlier draft SQLx schema. Existing draft databases need to be recreated; this project has no data migration for that draft.

Run `cargo test -p forge-storage`. To test PostgreSQL too, start `devenv up -d`, set `FORGE_TEST_POSTGRES_URL` to a test database URL, and rerun the tests.

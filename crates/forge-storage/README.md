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
- `events` has a calendar parent and either UTC instants plus a time zone or all-day dates. Ends are exclusive.
- `event_recurrence` holds an RRULE and the original local start of its series.
- `event_exceptions` holds cancellations or complete replacement events, keyed by the original occurrence start. Deleting a calendar or series cascades to its children.

`Storage::connect` accepts `sqlite:`, `postgres:`, or `postgresql:` URLs and applies embedded SQL migrations. SQLite file URLs need `?mode=rwc` to create a missing file; `sqlite::memory:` is supported. Timed instants have millisecond precision. Rule strings are stored as supplied after a nonempty check. The crate stores series definitions and exceptions but does not expand recurring instances or import ICS feeds yet.

Run `cargo test -p forge-storage`. To test PostgreSQL too, start `devenv up -d`, set `FORGE_TEST_POSTGRES_URL` to a test database URL, and rerun the tests.

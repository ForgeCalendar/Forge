use std::str::FromStr;

use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use chrono_tz::Tz;
use sqlx::{AnyPool, Row, any::AnyPoolOptions, any::AnyRow};
use uuid::Uuid;

use crate::model::{
    Calendar, Event, EventException, EventTime, NewEvent, Recurrence, RecurrenceAnchor,
    RecurrenceId,
};

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("database URL must use sqlite:, postgres:, or postgresql:")]
    InvalidDatabaseUrl,
    #[error("user ID must not be empty")]
    EmptyUserId,
    #[error("name or title must not be empty")]
    EmptyName,
    #[error("time zone is not a valid IANA name: {0}")]
    InvalidTimeZone(String),
    #[error("event end must be after its start")]
    InvalidTimeRange,
    #[error("timed events support millisecond precision")]
    UnsupportedTimePrecision,
    #[error("recurrence rule must not be empty")]
    EmptyRecurrenceRule,
    #[error("recurrence ID and replacement must match the event's time kind")]
    RecurrenceKindMismatch,
    #[error("calendar or event was not found for this user")]
    NotFound,
    #[error("event has no recurrence rule")]
    NotRecurring,
    #[error("stored calendar data is invalid: {0}")]
    CorruptData(String),
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Migration(#[from] sqlx::migrate::MigrateError),
}

#[derive(Clone)]
pub struct Storage {
    pool: AnyPool,
}

impl Storage {
    /// Connect to SQLite or PostgreSQL and apply the embedded migrations.
    /// SQLite file URLs need `?mode=rwc` to create a missing file.
    pub async fn connect(database_url: &str) -> Result<Self, StorageError> {
        if !database_url.starts_with("sqlite:")
            && !database_url.starts_with("postgres:")
            && !database_url.starts_with("postgresql:")
        {
            return Err(StorageError::InvalidDatabaseUrl);
        }

        sqlx::any::install_default_drivers();
        let max_connections = if database_url == "sqlite::memory:" {
            1
        } else {
            5
        };
        let pool = AnyPoolOptions::new()
            .max_connections(max_connections)
            .connect(database_url)
            .await?;
        MIGRATOR.run(&pool).await?;
        Ok(Self { pool })
    }

    /// Select one user's namespace. The caller authenticates the user first.
    pub fn for_user(&self, user_id: impl Into<String>) -> Result<UserStorage<'_>, StorageError> {
        let user_id = user_id.into();
        if user_id.trim().is_empty() {
            return Err(StorageError::EmptyUserId);
        }
        Ok(UserStorage {
            storage: self,
            user_id,
        })
    }

    pub async fn close(&self) {
        self.pool.close().await;
    }
}

/// Every query on this handle is restricted to its user ID.
pub struct UserStorage<'a> {
    storage: &'a Storage,
    user_id: String,
}

impl UserStorage<'_> {
    pub async fn create_calendar(
        &self,
        name: &str,
        time_zone: &str,
    ) -> Result<Calendar, StorageError> {
        validate_name(name)?;
        validate_time_zone(time_zone)?;
        let calendar = Calendar {
            id: Uuid::new_v4().to_string(),
            name: name.trim().to_owned(),
            time_zone: time_zone.to_owned(),
        };
        sqlx::query("INSERT INTO calendars (id, user_id, name, time_zone) VALUES ($1, $2, $3, $4)")
            .bind(&calendar.id)
            .bind(&self.user_id)
            .bind(&calendar.name)
            .bind(&calendar.time_zone)
            .execute(&self.storage.pool)
            .await?;
        Ok(calendar)
    }

    pub async fn get_calendar(&self, calendar_id: &str) -> Result<Option<Calendar>, StorageError> {
        let row =
            sqlx::query("SELECT id, name, time_zone FROM calendars WHERE id = $1 AND user_id = $2")
                .bind(calendar_id)
                .bind(&self.user_id)
                .fetch_optional(&self.storage.pool)
                .await?;
        row.map(|row| decode_calendar(&row)).transpose()
    }

    pub async fn list_calendars(&self) -> Result<Vec<Calendar>, StorageError> {
        let rows = sqlx::query(
            "SELECT id, name, time_zone FROM calendars WHERE user_id = $1 ORDER BY name, id",
        )
        .bind(&self.user_id)
        .fetch_all(&self.storage.pool)
        .await?;
        rows.iter().map(decode_calendar).collect()
    }

    /// Deleting a calendar also deletes its events, rules, and exceptions.
    pub async fn delete_calendar(&self, calendar_id: &str) -> Result<bool, StorageError> {
        let result = sqlx::query("DELETE FROM calendars WHERE id = $1 AND user_id = $2")
            .bind(calendar_id)
            .bind(&self.user_id)
            .execute(&self.storage.pool)
            .await?;
        Ok(result.rows_affected() == 1)
    }

    pub async fn create_event(
        &self,
        calendar_id: &str,
        details: NewEvent,
    ) -> Result<Event, StorageError> {
        validate_details(&details)?;
        let encoded = encode_time(&details.time);
        let event = Event {
            id: Uuid::new_v4().to_string(),
            calendar_id: calendar_id.to_owned(),
            details,
        };
        let result = sqlx::query(
            "INSERT INTO events (
                id, calendar_id, title, description, location, time_kind,
                start_ms, end_ms, start_date, end_date_exclusive, time_zone
             ) SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
             FROM calendars WHERE id = $2 AND user_id = $12",
        )
        .bind(&event.id)
        .bind(&event.calendar_id)
        .bind(&event.details.title)
        .bind(&event.details.description)
        .bind(&event.details.location)
        .bind(&encoded.kind)
        .bind(encoded.start_ms)
        .bind(encoded.end_ms)
        .bind(&encoded.start_date)
        .bind(&encoded.end_date_exclusive)
        .bind(&encoded.time_zone)
        .bind(&self.user_id)
        .execute(&self.storage.pool)
        .await?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(event)
    }

    pub async fn get_event(&self, event_id: &str) -> Result<Option<Event>, StorageError> {
        let row = sqlx::query(
            "SELECT e.* FROM events e JOIN calendars c ON c.id = e.calendar_id
             WHERE e.id = $1 AND c.user_id = $2",
        )
        .bind(event_id)
        .bind(&self.user_id)
        .fetch_optional(&self.storage.pool)
        .await?;
        row.map(|row| decode_event(&row)).transpose()
    }

    /// Return stored event definitions, including recurring series masters.
    pub async fn list_events(&self, calendar_id: &str) -> Result<Vec<Event>, StorageError> {
        if self.get_calendar(calendar_id).await?.is_none() {
            return Err(StorageError::NotFound);
        }
        let rows = sqlx::query(
            "SELECT e.* FROM events e JOIN calendars c ON c.id = e.calendar_id
             WHERE e.calendar_id = $1 AND c.user_id = $2 ORDER BY e.id",
        )
        .bind(calendar_id)
        .bind(&self.user_id)
        .fetch_all(&self.storage.pool)
        .await?;
        rows.iter().map(decode_event).collect()
    }

    pub async fn delete_event(&self, event_id: &str) -> Result<bool, StorageError> {
        let result = sqlx::query(
            "DELETE FROM events WHERE id = $1 AND calendar_id IN
             (SELECT id FROM calendars WHERE user_id = $2)",
        )
        .bind(event_id)
        .bind(&self.user_id)
        .execute(&self.storage.pool)
        .await?;
        Ok(result.rows_affected() == 1)
    }

    /// Store an RFC 5545 RRULE for a series. Rule expansion is not done here.
    pub async fn set_recurrence(
        &self,
        event_id: &str,
        rule: &str,
    ) -> Result<Recurrence, StorageError> {
        if rule.trim().is_empty() {
            return Err(StorageError::EmptyRecurrenceRule);
        }
        let event = self
            .get_event(event_id)
            .await?
            .ok_or(StorageError::NotFound)?;
        let anchor = recurrence_anchor(&event.details.time)?;
        let (local_start, time_zone) = encode_anchor(&anchor);
        let result = sqlx::query(
            "INSERT INTO event_recurrence (event_id, rrule, local_start, time_zone)
             SELECT $1, $2, $3, $4 FROM events e
             JOIN calendars c ON c.id = e.calendar_id
             WHERE e.id = $1 AND c.user_id = $5
             ON CONFLICT (event_id) DO UPDATE SET
               rrule = excluded.rrule,
               local_start = excluded.local_start,
               time_zone = excluded.time_zone",
        )
        .bind(event_id)
        .bind(rule)
        .bind(local_start)
        .bind(time_zone)
        .bind(&self.user_id)
        .execute(&self.storage.pool)
        .await?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(Recurrence {
            rule: rule.to_owned(),
            anchor,
        })
    }

    pub async fn get_recurrence(&self, event_id: &str) -> Result<Option<Recurrence>, StorageError> {
        let row = sqlx::query(
            "SELECT r.rrule, r.local_start, r.time_zone
             FROM event_recurrence r
             JOIN events e ON e.id = r.event_id
             JOIN calendars c ON c.id = e.calendar_id
             WHERE r.event_id = $1 AND c.user_id = $2",
        )
        .bind(event_id)
        .bind(&self.user_id)
        .fetch_optional(&self.storage.pool)
        .await?;
        row.map(|row| decode_recurrence(&row)).transpose()
    }

    /// Removing a rule also removes its instance exceptions.
    pub async fn clear_recurrence(&self, event_id: &str) -> Result<bool, StorageError> {
        let result = sqlx::query(
            "DELETE FROM event_recurrence WHERE event_id = $1 AND event_id IN
             (SELECT e.id FROM events e JOIN calendars c ON c.id = e.calendar_id
              WHERE c.user_id = $2)",
        )
        .bind(event_id)
        .bind(&self.user_id)
        .execute(&self.storage.pool)
        .await?;
        Ok(result.rows_affected() == 1)
    }

    /// Store a cancellation or a complete replacement for one original instance.
    pub async fn put_exception(
        &self,
        event_id: &str,
        exception: EventException,
    ) -> Result<(), StorageError> {
        let event = self
            .get_event(event_id)
            .await?
            .ok_or(StorageError::NotFound)?;
        if self.get_recurrence(event_id).await?.is_none() {
            return Err(StorageError::NotRecurring);
        }
        validate_exception(&event.details.time, &exception)?;
        let recurrence_id = encode_recurrence_id(&exception.original_start);
        let replacement = exception.replacement.as_ref();
        let encoded = replacement.map(|item| encode_time(&item.time));
        let result = sqlx::query(
            "INSERT INTO event_exceptions (
                event_id, recurrence_id, cancelled, title, description, location,
                time_kind, start_ms, end_ms, start_date, end_date_exclusive, time_zone
             ) SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
             FROM event_recurrence r
             JOIN events e ON e.id = r.event_id
             JOIN calendars c ON c.id = e.calendar_id
             WHERE r.event_id = $1 AND c.user_id = $13
             ON CONFLICT (event_id, recurrence_id) DO UPDATE SET
               cancelled = excluded.cancelled,
               title = excluded.title,
               description = excluded.description,
               location = excluded.location,
               time_kind = excluded.time_kind,
               start_ms = excluded.start_ms,
               end_ms = excluded.end_ms,
               start_date = excluded.start_date,
               end_date_exclusive = excluded.end_date_exclusive,
               time_zone = excluded.time_zone",
        )
        .bind(event_id)
        .bind(recurrence_id)
        .bind(if replacement.is_none() { 1_i64 } else { 0_i64 })
        .bind(replacement.map(|item| item.title.as_str()))
        .bind(replacement.and_then(|item| item.description.as_deref()))
        .bind(replacement.and_then(|item| item.location.as_deref()))
        .bind(encoded.as_ref().map(|item| item.kind.as_str()))
        .bind(encoded.as_ref().and_then(|item| item.start_ms))
        .bind(encoded.as_ref().and_then(|item| item.end_ms))
        .bind(encoded.as_ref().and_then(|item| item.start_date.as_deref()))
        .bind(
            encoded
                .as_ref()
                .and_then(|item| item.end_date_exclusive.as_deref()),
        )
        .bind(encoded.as_ref().and_then(|item| item.time_zone.as_deref()))
        .bind(&self.user_id)
        .execute(&self.storage.pool)
        .await?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotRecurring);
        }
        Ok(())
    }

    pub async fn list_exceptions(
        &self,
        event_id: &str,
    ) -> Result<Vec<EventException>, StorageError> {
        let event = self
            .get_event(event_id)
            .await?
            .ok_or(StorageError::NotFound)?;
        if self.get_recurrence(event_id).await?.is_none() {
            return Err(StorageError::NotRecurring);
        }
        let rows = sqlx::query(
            "SELECT x.* FROM event_exceptions x
             JOIN event_recurrence r ON r.event_id = x.event_id
             JOIN events e ON e.id = r.event_id
             JOIN calendars c ON c.id = e.calendar_id
             WHERE x.event_id = $1 AND c.user_id = $2 ORDER BY x.recurrence_id",
        )
        .bind(event_id)
        .bind(&self.user_id)
        .fetch_all(&self.storage.pool)
        .await?;
        rows.iter()
            .map(|row| decode_exception(row, &event.details.time))
            .collect()
    }
}

struct EncodedTime {
    kind: String,
    start_ms: Option<i64>,
    end_ms: Option<i64>,
    start_date: Option<String>,
    end_date_exclusive: Option<String>,
    time_zone: Option<String>,
}

fn validate_name(name: &str) -> Result<(), StorageError> {
    if name.trim().is_empty() {
        return Err(StorageError::EmptyName);
    }
    Ok(())
}

fn validate_time_zone(time_zone: &str) -> Result<Tz, StorageError> {
    Tz::from_str(time_zone).map_err(|_| StorageError::InvalidTimeZone(time_zone.to_owned()))
}

fn validate_details(details: &NewEvent) -> Result<(), StorageError> {
    validate_name(&details.title)?;
    match &details.time {
        EventTime::Timed {
            start,
            end,
            time_zone,
        } => {
            if end <= start {
                return Err(StorageError::InvalidTimeRange);
            }
            if start.timestamp_subsec_nanos() % 1_000_000 != 0
                || end.timestamp_subsec_nanos() % 1_000_000 != 0
            {
                return Err(StorageError::UnsupportedTimePrecision);
            }
            validate_time_zone(time_zone)?;
        }
        EventTime::AllDay {
            start,
            end_exclusive,
        } => {
            if end_exclusive <= start {
                return Err(StorageError::InvalidTimeRange);
            }
        }
    }
    Ok(())
}

fn validate_exception(master: &EventTime, exception: &EventException) -> Result<(), StorageError> {
    let same_id_kind = matches!(
        (master, &exception.original_start),
        (EventTime::Timed { .. }, RecurrenceId::Timed(_))
            | (EventTime::AllDay { .. }, RecurrenceId::AllDay(_))
    );
    let same_replacement_kind = match (&exception.replacement, master) {
        (None, _) => true,
        (Some(item), EventTime::Timed { .. }) => matches!(item.time, EventTime::Timed { .. }),
        (Some(item), EventTime::AllDay { .. }) => matches!(item.time, EventTime::AllDay { .. }),
    };
    if !same_id_kind || !same_replacement_kind {
        return Err(StorageError::RecurrenceKindMismatch);
    }
    if let Some(item) = &exception.replacement {
        validate_details(item)?;
    }
    Ok(())
}

fn encode_time(time: &EventTime) -> EncodedTime {
    match time {
        EventTime::Timed {
            start,
            end,
            time_zone,
        } => EncodedTime {
            kind: "timed".into(),
            start_ms: Some(start.timestamp_millis()),
            end_ms: Some(end.timestamp_millis()),
            start_date: None,
            end_date_exclusive: None,
            time_zone: Some(time_zone.clone()),
        },
        EventTime::AllDay {
            start,
            end_exclusive,
        } => EncodedTime {
            kind: "all_day".into(),
            start_ms: None,
            end_ms: None,
            start_date: Some(start.format("%Y-%m-%d").to_string()),
            end_date_exclusive: Some(end_exclusive.format("%Y-%m-%d").to_string()),
            time_zone: None,
        },
    }
}

fn decode_time(row: &AnyRow) -> Result<EventTime, StorageError> {
    let kind: String = row.try_get("time_kind")?;
    match kind.as_str() {
        "timed" => {
            let start_ms: i64 = row.try_get("start_ms")?;
            let end_ms: i64 = row.try_get("end_ms")?;
            let time_zone: String = row.try_get("time_zone")?;
            validate_time_zone(&time_zone)?;
            let start = DateTime::<Utc>::from_timestamp_millis(start_ms)
                .ok_or_else(|| StorageError::CorruptData("invalid start_ms".into()))?;
            let end = DateTime::<Utc>::from_timestamp_millis(end_ms)
                .ok_or_else(|| StorageError::CorruptData("invalid end_ms".into()))?;
            Ok(EventTime::Timed {
                start,
                end,
                time_zone,
            })
        }
        "all_day" => {
            let start: String = row.try_get("start_date")?;
            let end: String = row.try_get("end_date_exclusive")?;
            Ok(EventTime::AllDay {
                start: parse_date(&start)?,
                end_exclusive: parse_date(&end)?,
            })
        }
        _ => Err(StorageError::CorruptData(format!(
            "invalid time_kind: {kind}"
        ))),
    }
}

fn decode_calendar(row: &AnyRow) -> Result<Calendar, StorageError> {
    Ok(Calendar {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
        time_zone: row.try_get("time_zone")?,
    })
}

fn decode_details(row: &AnyRow) -> Result<NewEvent, StorageError> {
    Ok(NewEvent {
        title: row.try_get("title")?,
        description: row.try_get("description")?,
        location: row.try_get("location")?,
        time: decode_time(row)?,
    })
}

fn decode_event(row: &AnyRow) -> Result<Event, StorageError> {
    Ok(Event {
        id: row.try_get("id")?,
        calendar_id: row.try_get("calendar_id")?,
        details: decode_details(row)?,
    })
}

fn recurrence_anchor(time: &EventTime) -> Result<RecurrenceAnchor, StorageError> {
    match time {
        EventTime::Timed {
            start, time_zone, ..
        } => {
            let zone = validate_time_zone(time_zone)?;
            Ok(RecurrenceAnchor::Timed {
                local_start: start.with_timezone(&zone).naive_local(),
                time_zone: time_zone.clone(),
            })
        }
        EventTime::AllDay { start, .. } => Ok(RecurrenceAnchor::AllDay { start: *start }),
    }
}

fn encode_anchor(anchor: &RecurrenceAnchor) -> (String, Option<String>) {
    match anchor {
        RecurrenceAnchor::Timed {
            local_start,
            time_zone,
        } => (format_local(*local_start), Some(time_zone.clone())),
        RecurrenceAnchor::AllDay { start } => (start.format("%Y-%m-%d").to_string(), None),
    }
}

fn decode_recurrence(row: &AnyRow) -> Result<Recurrence, StorageError> {
    let rule: String = row.try_get("rrule")?;
    let local_start: String = row.try_get("local_start")?;
    let time_zone: Option<String> = row.try_get("time_zone")?;
    let anchor = match time_zone {
        Some(time_zone) => RecurrenceAnchor::Timed {
            local_start: parse_local(&local_start)?,
            time_zone,
        },
        None => RecurrenceAnchor::AllDay {
            start: parse_date(&local_start)?,
        },
    };
    Ok(Recurrence { rule, anchor })
}

fn encode_recurrence_id(id: &RecurrenceId) -> String {
    match id {
        RecurrenceId::Timed(local) => format_local(*local),
        RecurrenceId::AllDay(date) => date.format("%Y-%m-%d").to_string(),
    }
}

fn decode_exception(row: &AnyRow, master: &EventTime) -> Result<EventException, StorageError> {
    let encoded_id: String = row.try_get("recurrence_id")?;
    let original_start = match master {
        EventTime::Timed { .. } => RecurrenceId::Timed(parse_local(&encoded_id)?),
        EventTime::AllDay { .. } => RecurrenceId::AllDay(parse_date(&encoded_id)?),
    };
    let cancelled: i64 = row.try_get("cancelled")?;
    let replacement = match cancelled {
        0 => Some(decode_details(row)?),
        1 => None,
        _ => return Err(StorageError::CorruptData("invalid cancelled flag".into())),
    };
    Ok(EventException {
        original_start,
        replacement,
    })
}

fn format_local(value: NaiveDateTime) -> String {
    value.format("%Y-%m-%dT%H:%M:%S%.9f").to_string()
}

fn parse_local(value: &str) -> Result<NaiveDateTime, StorageError> {
    NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.f")
        .map_err(|_| StorageError::CorruptData(format!("invalid local datetime: {value}")))
}

fn parse_date(value: &str) -> Result<NaiveDate, StorageError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| StorageError::CorruptData(format!("invalid date: {value}")))
}

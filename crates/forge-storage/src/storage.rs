use std::str::FromStr;

use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use chrono_tz::Tz;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectOptions, Database, DatabaseConnection, DbErr,
    EntityTrait, QueryFilter, QueryOrder, Set, TransactionTrait, sea_query::OnConflict,
};
use sea_orm_migration::MigratorTrait;
use uuid::Uuid;

use crate::entity::{calendar, event, event_time, exception, exception_time, recurrence};
use crate::migration::Migrator;
use crate::model::{
    Calendar, Event, EventException, EventTime, NewEvent, Recurrence, RecurrenceAnchor,
    RecurrenceId,
};

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
    Database(#[from] DbErr),
}

#[derive(Clone)]
pub struct Storage {
    db: DatabaseConnection,
}

impl Storage {
    /// Connect to SQLite or PostgreSQL and apply versioned Rust migrations.
    /// SQLite file URLs need `?mode=rwc` to create a missing file.
    pub async fn connect(database_url: &str) -> Result<Self, StorageError> {
        if !database_url.starts_with("sqlite:")
            && !database_url.starts_with("postgres:")
            && !database_url.starts_with("postgresql:")
        {
            return Err(StorageError::InvalidDatabaseUrl);
        }
        let mut options = ConnectOptions::new(database_url);
        options.max_connections(if database_url == "sqlite::memory:" {
            1
        } else {
            5
        });
        let db = Database::connect(options).await?;
        Migrator::up(&db, None).await?;
        Ok(Self { db })
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
        let _ = self.db.clone().close().await;
    }
}

/// Every operation on this handle is restricted to its user ID.
pub struct UserStorage<'a> {
    storage: &'a Storage,
    user_id: String,
}

impl UserStorage<'_> {
    async fn owned_calendar(&self, id: &str) -> Result<Option<calendar::Model>, StorageError> {
        Ok(calendar::Entity::find_by_id(id.to_owned())
            .filter(calendar::Column::UserId.eq(&self.user_id))
            .one(&self.storage.db)
            .await?)
    }

    async fn owned_event(&self, id: &str) -> Result<Option<event::Model>, StorageError> {
        let Some(row) = event::Entity::find_by_id(id.to_owned())
            .one(&self.storage.db)
            .await?
        else {
            return Ok(None);
        };
        if self.owned_calendar(&row.calendar_id).await?.is_none() {
            return Ok(None);
        }
        Ok(Some(row))
    }

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
        calendar::ActiveModel {
            id: Set(calendar.id.clone()),
            user_id: Set(self.user_id.clone()),
            name: Set(calendar.name.clone()),
            time_zone: Set(calendar.time_zone.clone()),
        }
        .insert(&self.storage.db)
        .await?;
        Ok(calendar)
    }

    pub async fn get_calendar(&self, id: &str) -> Result<Option<Calendar>, StorageError> {
        Ok(self.owned_calendar(id).await?.map(decode_calendar))
    }

    pub async fn list_calendars(&self) -> Result<Vec<Calendar>, StorageError> {
        Ok(calendar::Entity::find()
            .filter(calendar::Column::UserId.eq(&self.user_id))
            .order_by_asc(calendar::Column::Name)
            .order_by_asc(calendar::Column::Id)
            .all(&self.storage.db)
            .await?
            .into_iter()
            .map(decode_calendar)
            .collect())
    }

    /// Deleting a calendar also deletes its events, rules, and exceptions.
    pub async fn delete_calendar(&self, id: &str) -> Result<bool, StorageError> {
        let result = calendar::Entity::delete_many()
            .filter(calendar::Column::Id.eq(id))
            .filter(calendar::Column::UserId.eq(&self.user_id))
            .exec(&self.storage.db)
            .await?;
        Ok(result.rows_affected == 1)
    }

    pub async fn create_event(
        &self,
        calendar_id: &str,
        details: NewEvent,
    ) -> Result<Event, StorageError> {
        validate_details(&details)?;
        if self.owned_calendar(calendar_id).await?.is_none() {
            return Err(StorageError::NotFound);
        }
        let encoded = encode_time(&details.time);
        let event = Event {
            id: Uuid::new_v4().to_string(),
            calendar_id: calendar_id.to_owned(),
            details,
        };
        let txn = self.storage.db.begin().await?;
        event::ActiveModel {
            id: Set(event.id.clone()),
            calendar_id: Set(event.calendar_id.clone()),
            title: Set(event.details.title.clone()),
            description: Set(event.details.description.clone()),
            location: Set(event.details.location.clone()),
        }
        .insert(&txn)
        .await?;
        event_time::ActiveModel {
            event_id: Set(event.id.clone()),
            start_ms: Set(encoded.start_ms),
            end_ms: Set(encoded.end_ms),
            start_date: Set(encoded.start_date),
            end_date_exclusive: Set(encoded.end_date_exclusive),
            time_zone: Set(encoded.time_zone),
        }
        .insert(&txn)
        .await?;
        txn.commit().await?;
        Ok(event)
    }

    pub async fn get_event(&self, id: &str) -> Result<Option<Event>, StorageError> {
        let Some(row) = self.owned_event(id).await? else {
            return Ok(None);
        };
        let time = event_time::Entity::find_by_id(id.to_owned())
            .one(&self.storage.db)
            .await?
            .ok_or_else(|| StorageError::CorruptData(format!("event {id} has no time")))?;
        Ok(Some(decode_event(row, time)?))
    }

    /// Return stored event definitions, including recurring series masters.
    pub async fn list_events(&self, calendar_id: &str) -> Result<Vec<Event>, StorageError> {
        if self.owned_calendar(calendar_id).await?.is_none() {
            return Err(StorageError::NotFound);
        }
        let rows = event::Entity::find()
            .filter(event::Column::CalendarId.eq(calendar_id))
            .order_by_asc(event::Column::Id)
            .all(&self.storage.db)
            .await?;
        let mut events = Vec::with_capacity(rows.len());
        for row in rows {
            let time = event_time::Entity::find_by_id(row.id.clone())
                .one(&self.storage.db)
                .await?
                .ok_or_else(|| {
                    StorageError::CorruptData(format!("event {} has no time", row.id))
                })?;
            events.push(decode_event(row, time)?);
        }
        Ok(events)
    }

    pub async fn delete_event(&self, id: &str) -> Result<bool, StorageError> {
        let Some(row) = self.owned_event(id).await? else {
            return Ok(false);
        };
        let result = event::Entity::delete_many()
            .filter(event::Column::Id.eq(&row.id))
            .filter(event::Column::CalendarId.eq(&row.calendar_id))
            .exec(&self.storage.db)
            .await?;
        Ok(result.rows_affected == 1)
    }

    /// Store an RFC 5545 RRULE for a series. Rule expansion is not done here.
    pub async fn set_recurrence(&self, id: &str, rule: &str) -> Result<Recurrence, StorageError> {
        if rule.trim().is_empty() {
            return Err(StorageError::EmptyRecurrenceRule);
        }
        let event = self.get_event(id).await?.ok_or(StorageError::NotFound)?;
        let anchor = recurrence_anchor(&event.details.time)?;
        let (local_start, start_date, time_zone) = encode_anchor(&anchor);
        recurrence::Entity::insert(recurrence::ActiveModel {
            event_id: Set(id.to_owned()),
            rrule: Set(rule.to_owned()),
            local_start: Set(local_start),
            start_date: Set(start_date),
            time_zone: Set(time_zone),
        })
        .on_conflict(
            OnConflict::column(recurrence::Column::EventId)
                .update_columns([
                    recurrence::Column::Rrule,
                    recurrence::Column::LocalStart,
                    recurrence::Column::StartDate,
                    recurrence::Column::TimeZone,
                ])
                .to_owned(),
        )
        .exec(&self.storage.db)
        .await?;
        Ok(Recurrence {
            rule: rule.to_owned(),
            anchor,
        })
    }

    pub async fn get_recurrence(&self, id: &str) -> Result<Option<Recurrence>, StorageError> {
        if self.owned_event(id).await?.is_none() {
            return Ok(None);
        }
        recurrence::Entity::find_by_id(id.to_owned())
            .one(&self.storage.db)
            .await?
            .map(decode_recurrence)
            .transpose()
    }

    /// Removing a rule also removes its instance exceptions.
    pub async fn clear_recurrence(&self, id: &str) -> Result<bool, StorageError> {
        if self.owned_event(id).await?.is_none() {
            return Ok(false);
        }
        let result = recurrence::Entity::delete_by_id(id.to_owned())
            .exec(&self.storage.db)
            .await?;
        Ok(result.rows_affected == 1)
    }

    /// Store a cancellation or a complete replacement for one original instance.
    pub async fn put_exception(
        &self,
        id: &str,
        exception: EventException,
    ) -> Result<(), StorageError> {
        let event = self.get_event(id).await?.ok_or(StorageError::NotFound)?;
        if self.get_recurrence(id).await?.is_none() {
            return Err(StorageError::NotRecurring);
        }
        validate_exception(&event.details.time, &exception)?;
        let txn = self.storage.db.begin().await?;
        let query = exception::Entity::find().filter(exception::Column::EventId.eq(id));
        let existing = match exception.original_start {
            RecurrenceId::Timed(local) => {
                query
                    .filter(exception::Column::OriginalLocalStart.eq(local))
                    .one(&txn)
                    .await?
            }
            RecurrenceId::AllDay(date) => {
                query
                    .filter(exception::Column::OriginalStartDate.eq(date))
                    .one(&txn)
                    .await?
            }
        };
        let exception_id = existing
            .as_ref()
            .map_or_else(|| Uuid::new_v4().to_string(), |row| row.id.clone());
        let (original_local_start, original_start_date) = match exception.original_start {
            RecurrenceId::Timed(local) => (Some(local), None),
            RecurrenceId::AllDay(date) => (None, Some(date)),
        };
        let replacement = exception.replacement.as_ref();
        let encoded = replacement.map(|item| encode_time(&item.time));
        let row = exception::ActiveModel {
            id: Set(exception_id.clone()),
            event_id: Set(id.to_owned()),
            original_local_start: Set(original_local_start),
            original_start_date: Set(original_start_date),
            cancelled: Set(replacement.is_none()),
            title: Set(replacement.map(|item| item.title.clone())),
            description: Set(replacement.and_then(|item| item.description.clone())),
            location: Set(replacement.and_then(|item| item.location.clone())),
        };
        if existing.is_some() {
            row.update(&txn).await?;
        } else {
            row.insert(&txn).await?;
        }
        if let Some(encoded) = encoded {
            exception_time::Entity::insert(exception_time::ActiveModel {
                exception_id: Set(exception_id),
                start_ms: Set(encoded.start_ms),
                end_ms: Set(encoded.end_ms),
                start_date: Set(encoded.start_date),
                end_date_exclusive: Set(encoded.end_date_exclusive),
                time_zone: Set(encoded.time_zone),
            })
            .on_conflict(
                OnConflict::column(exception_time::Column::ExceptionId)
                    .update_columns([
                        exception_time::Column::StartMs,
                        exception_time::Column::EndMs,
                        exception_time::Column::StartDate,
                        exception_time::Column::EndDateExclusive,
                        exception_time::Column::TimeZone,
                    ])
                    .to_owned(),
            )
            .exec(&txn)
            .await?;
        } else {
            exception_time::Entity::delete_by_id(exception_id)
                .exec(&txn)
                .await?;
        }
        txn.commit().await?;
        Ok(())
    }

    pub async fn list_exceptions(&self, id: &str) -> Result<Vec<EventException>, StorageError> {
        let event = self.get_event(id).await?.ok_or(StorageError::NotFound)?;
        if self.get_recurrence(id).await?.is_none() {
            return Err(StorageError::NotRecurring);
        }
        let query = exception::Entity::find().filter(exception::Column::EventId.eq(id));
        let query = match event.details.time {
            EventTime::Timed { .. } => query.order_by_asc(exception::Column::OriginalLocalStart),
            EventTime::AllDay { .. } => query.order_by_asc(exception::Column::OriginalStartDate),
        };
        let rows = query.all(&self.storage.db).await?;
        let mut exceptions = Vec::with_capacity(rows.len());
        for row in rows {
            let time = exception_time::Entity::find_by_id(row.id.clone())
                .one(&self.storage.db)
                .await?;
            exceptions.push(decode_exception(row, time, &event.details.time)?);
        }
        Ok(exceptions)
    }
}

struct EncodedTime {
    start_ms: Option<i64>,
    end_ms: Option<i64>,
    start_date: Option<NaiveDate>,
    end_date_exclusive: Option<NaiveDate>,
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
    if let RecurrenceId::Timed(local) = &exception.original_start
        && local.and_utc().timestamp_subsec_nanos() % 1_000_000 != 0
    {
        return Err(StorageError::UnsupportedTimePrecision);
    }
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
            start_ms: None,
            end_ms: None,
            start_date: Some(*start),
            end_date_exclusive: Some(*end_exclusive),
            time_zone: None,
        },
    }
}

fn decode_time(
    start_ms: Option<i64>,
    end_ms: Option<i64>,
    start_date: Option<NaiveDate>,
    end_date_exclusive: Option<NaiveDate>,
    time_zone: Option<&str>,
) -> Result<EventTime, StorageError> {
    match (start_ms, end_ms, start_date, end_date_exclusive, time_zone) {
        (Some(start_ms), Some(end_ms), None, None, Some(time_zone)) => {
            if end_ms <= start_ms {
                return Err(StorageError::CorruptData(
                    "timed event has invalid range".into(),
                ));
            }
            validate_time_zone(time_zone)?;
            let start = DateTime::<Utc>::from_timestamp_millis(start_ms)
                .ok_or_else(|| StorageError::CorruptData("invalid start_ms".into()))?;
            let end = DateTime::<Utc>::from_timestamp_millis(end_ms)
                .ok_or_else(|| StorageError::CorruptData("invalid end_ms".into()))?;
            Ok(EventTime::Timed {
                start,
                end,
                time_zone: time_zone.to_owned(),
            })
        }
        (None, None, Some(start), Some(end), None) => {
            if end <= start {
                return Err(StorageError::CorruptData(
                    "all-day event has invalid range".into(),
                ));
            }
            Ok(EventTime::AllDay {
                start,
                end_exclusive: end,
            })
        }
        _ => Err(StorageError::CorruptData(
            "event time fields have no valid shape".into(),
        )),
    }
}

fn decode_calendar(row: calendar::Model) -> Calendar {
    Calendar {
        id: row.id,
        name: row.name,
        time_zone: row.time_zone,
    }
}

fn decode_event(row: event::Model, stored_time: event_time::Model) -> Result<Event, StorageError> {
    if row.id != stored_time.event_id {
        return Err(StorageError::CorruptData(
            "event time belongs to another event".into(),
        ));
    }
    let time = decode_time(
        stored_time.start_ms,
        stored_time.end_ms,
        stored_time.start_date,
        stored_time.end_date_exclusive,
        stored_time.time_zone.as_deref(),
    )?;
    Ok(Event {
        id: row.id,
        calendar_id: row.calendar_id,
        details: NewEvent {
            title: row.title,
            description: row.description,
            location: row.location,
            time,
        },
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

fn encode_anchor(
    anchor: &RecurrenceAnchor,
) -> (Option<NaiveDateTime>, Option<NaiveDate>, Option<String>) {
    match anchor {
        RecurrenceAnchor::Timed {
            local_start,
            time_zone,
        } => (Some(*local_start), None, Some(time_zone.clone())),
        RecurrenceAnchor::AllDay { start } => (None, Some(*start), None),
    }
}

fn decode_recurrence(row: recurrence::Model) -> Result<Recurrence, StorageError> {
    let anchor = match (row.local_start, row.start_date, row.time_zone) {
        (Some(local_start), None, Some(time_zone)) => RecurrenceAnchor::Timed {
            local_start,
            time_zone,
        },
        (None, Some(start), None) => RecurrenceAnchor::AllDay { start },
        _ => {
            return Err(StorageError::CorruptData(
                "recurrence anchor has no valid shape".into(),
            ));
        }
    };
    Ok(Recurrence {
        rule: row.rrule,
        anchor,
    })
}

fn decode_exception(
    row: exception::Model,
    stored_time: Option<exception_time::Model>,
    master: &EventTime,
) -> Result<EventException, StorageError> {
    let original_start = match (master, row.original_local_start, row.original_start_date) {
        (EventTime::Timed { .. }, Some(local), None) => RecurrenceId::Timed(local),
        (EventTime::AllDay { .. }, None, Some(date)) => RecurrenceId::AllDay(date),
        _ => {
            return Err(StorageError::CorruptData(
                "exception ID has no valid shape".into(),
            ));
        }
    };
    let replacement = match (row.cancelled, stored_time) {
        (false, Some(time)) => Some(NewEvent {
            title: row
                .title
                .ok_or_else(|| StorageError::CorruptData("missing replacement title".into()))?,
            description: row.description,
            location: row.location,
            time: decode_time(
                time.start_ms,
                time.end_ms,
                time.start_date,
                time.end_date_exclusive,
                time.time_zone.as_deref(),
            )?,
        }),
        (true, None)
            if row.title.is_none() && row.description.is_none() && row.location.is_none() =>
        {
            None
        }
        _ => {
            return Err(StorageError::CorruptData(
                "exception replacement has no valid shape".into(),
            ));
        }
    };
    Ok(EventException {
        original_start,
        replacement,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_stored_time_shapes() {
        assert!(matches!(
            decode_time(Some(0), Some(1), None, None, None),
            Err(StorageError::CorruptData(_))
        ));
        assert!(matches!(
            decode_time(Some(2), Some(1), None, None, Some("UTC")),
            Err(StorageError::CorruptData(_))
        ));
        assert!(matches!(
            decode_time(None, None, Some(NaiveDate::MIN), Some(NaiveDate::MIN), None),
            Err(StorageError::CorruptData(_))
        ));
    }
}

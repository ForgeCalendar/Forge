use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};

/// A calendar owned by one user.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Calendar {
    pub id: String,
    pub name: String,
    pub time_zone: String,
}

/// The two supported event time shapes. Ends are exclusive.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EventTime {
    Timed {
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        time_zone: String,
    },
    AllDay {
        start: NaiveDate,
        end_exclusive: NaiveDate,
    },
}

/// The editable fields of an event or a changed recurrence instance.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewEvent {
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub time: EventTime,
}

/// A stored event definition. Recurring instances are not materialized here.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Event {
    pub id: String,
    pub calendar_id: String,
    pub details: NewEvent,
}

/// A recurrence rule and the local start that anchors it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Recurrence {
    pub rule: String,
    pub anchor: RecurrenceAnchor,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RecurrenceAnchor {
    Timed {
        local_start: NaiveDateTime,
        time_zone: String,
    },
    AllDay {
        start: NaiveDate,
    },
}

/// The original instance start, even when an exception moves the instance.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RecurrenceId {
    Timed(NaiveDateTime),
    AllDay(NaiveDate),
}

/// A cancelled instance, or a complete replacement of one instance.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EventException {
    pub original_start: RecurrenceId,
    pub replacement: Option<NewEvent>,
}

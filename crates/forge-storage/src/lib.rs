//! Calendar storage backed by SQLite or PostgreSQL.
//!
//! Every operation is scoped to a user handle. This crate stores event series
//! and their exceptions; recurrence expansion belongs to a later calendar
//! service, so a listed event represents its stored definition.

mod entity;
mod migration;
mod model;
mod storage;

pub use model::{
    Calendar, Event, EventException, EventTime, NewEvent, Recurrence, RecurrenceAnchor,
    RecurrenceId,
};
pub use storage::{Storage, StorageError, UserStorage};

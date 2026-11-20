use chrono::{DateTime, NaiveDate, TimeZone, Timelike, Utc};
use forge_storage::{
    EventException, EventTime, NewEvent, RecurrenceAnchor, RecurrenceId, Storage, StorageError,
};

fn utc(year: i32, month: u32, day: u32, hour: u32) -> DateTime<Utc> {
    Utc.with_ymd_and_hms(year, month, day, hour, 0, 0)
        .single()
        .unwrap()
}

fn date(year: i32, month: u32, day: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(year, month, day).unwrap()
}

fn timed_event() -> NewEvent {
    NewEvent {
        title: "Planning".into(),
        description: Some("Choose the next step".into()),
        location: None,
        time: EventTime::Timed {
            start: utc(2026, 11, 19, 14),
            end: utc(2026, 11, 19, 15),
            time_zone: "America/Detroit".into(),
        },
    }
}

async fn shared_calendar_contract(storage: &Storage) {
    let owner_id = format!("owner-{}", uuid::Uuid::new_v4());
    let other_id = format!("other-{}", uuid::Uuid::new_v4());
    let owner = storage.for_user(owner_id).unwrap();
    let other = storage.for_user(other_id).unwrap();

    let calendar = owner
        .create_calendar("Work", "America/Detroit")
        .await
        .unwrap();
    assert_eq!(
        owner.list_calendars().await.unwrap(),
        vec![calendar.clone()]
    );
    assert_eq!(other.get_calendar(&calendar.id).await.unwrap(), None);
    assert!(matches!(
        other.list_events(&calendar.id).await,
        Err(StorageError::NotFound)
    ));

    let event = owner
        .create_event(&calendar.id, timed_event())
        .await
        .unwrap();
    assert_eq!(
        owner.get_event(&event.id).await.unwrap(),
        Some(event.clone())
    );
    assert_eq!(other.get_event(&event.id).await.unwrap(), None);
    assert!(matches!(
        other.create_event(&calendar.id, timed_event()).await,
        Err(StorageError::NotFound)
    ));

    let all_day = owner
        .create_event(
            &calendar.id,
            NewEvent {
                title: "Conference".into(),
                description: None,
                location: Some("Detroit".into()),
                time: EventTime::AllDay {
                    start: date(2026, 11, 20),
                    end_exclusive: date(2026, 11, 22),
                },
            },
        )
        .await
        .unwrap();
    assert_eq!(owner.list_events(&calendar.id).await.unwrap().len(), 2);
    assert_eq!(
        owner.get_event(&all_day.id).await.unwrap(),
        Some(all_day.clone())
    );

    let all_day_recurrence = owner
        .set_recurrence(&all_day.id, "FREQ=YEARLY;COUNT=2")
        .await
        .unwrap();
    assert_eq!(
        all_day_recurrence.anchor,
        RecurrenceAnchor::AllDay {
            start: date(2026, 11, 20)
        }
    );
    let all_day_cancelled = EventException {
        original_start: RecurrenceId::AllDay(date(2027, 11, 20)),
        replacement: None,
    };
    owner
        .put_exception(&all_day.id, all_day_cancelled.clone())
        .await
        .unwrap();
    assert_eq!(
        owner.list_exceptions(&all_day.id).await.unwrap(),
        vec![all_day_cancelled]
    );
    assert!(owner.clear_recurrence(&all_day.id).await.unwrap());

    let recurrence = owner
        .set_recurrence(&event.id, "FREQ=WEEKLY;COUNT=3")
        .await
        .unwrap();
    assert_eq!(recurrence.rule, "FREQ=WEEKLY;COUNT=3");
    assert_eq!(
        recurrence.anchor,
        RecurrenceAnchor::Timed {
            local_start: date(2026, 11, 19).and_hms_opt(9, 0, 0).unwrap(),
            time_zone: "America/Detroit".into(),
        }
    );
    assert_eq!(
        owner.get_recurrence(&event.id).await.unwrap(),
        Some(recurrence)
    );
    assert_eq!(other.get_recurrence(&event.id).await.unwrap(), None);
    assert!(matches!(
        other.set_recurrence(&event.id, "FREQ=DAILY").await,
        Err(StorageError::NotFound)
    ));

    let cancelled = EventException {
        original_start: RecurrenceId::Timed(date(2026, 11, 26).and_hms_opt(9, 0, 0).unwrap()),
        replacement: None,
    };
    assert!(matches!(
        other.put_exception(&event.id, cancelled.clone()).await,
        Err(StorageError::NotFound)
    ));
    owner
        .put_exception(&event.id, cancelled.clone())
        .await
        .unwrap();
    let moved = EventException {
        original_start: RecurrenceId::Timed(date(2026, 12, 3).and_hms_opt(9, 0, 0).unwrap()),
        replacement: Some(NewEvent {
            title: "Planning moved".into(),
            description: None,
            location: Some("Online".into()),
            time: EventTime::Timed {
                start: utc(2026, 12, 4, 14),
                end: utc(2026, 12, 4, 15),
                time_zone: "America/Detroit".into(),
            },
        }),
    };
    owner.put_exception(&event.id, moved.clone()).await.unwrap();
    assert_eq!(
        owner.list_exceptions(&event.id).await.unwrap(),
        vec![cancelled.clone(), moved.clone()]
    );
    owner
        .put_exception(
            &event.id,
            EventException {
                original_start: moved.original_start.clone(),
                replacement: None,
            },
        )
        .await
        .unwrap();
    assert_eq!(
        owner.list_exceptions(&event.id).await.unwrap()[1].replacement,
        None
    );
    owner.put_exception(&event.id, moved.clone()).await.unwrap();
    assert_eq!(
        owner.list_exceptions(&event.id).await.unwrap(),
        vec![cancelled, moved]
    );
    assert!(matches!(
        other.list_exceptions(&event.id).await,
        Err(StorageError::NotFound)
    ));

    assert!(!other.clear_recurrence(&event.id).await.unwrap());
    assert!(owner.clear_recurrence(&event.id).await.unwrap());
    assert_eq!(owner.get_recurrence(&event.id).await.unwrap(), None);
    owner
        .set_recurrence(&event.id, "FREQ=DAILY;COUNT=2")
        .await
        .unwrap();
    assert!(owner.list_exceptions(&event.id).await.unwrap().is_empty());

    assert!(!other.delete_calendar(&calendar.id).await.unwrap());
    assert!(owner.delete_calendar(&calendar.id).await.unwrap());
    assert_eq!(owner.get_event(&event.id).await.unwrap(), None);
    assert_eq!(owner.get_recurrence(&event.id).await.unwrap(), None);
}

#[tokio::test]
async fn sqlite_calendar_contract_and_persistence() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("calendar.db");
    let url = format!("sqlite://{}?mode=rwc", path.display());
    let storage = Storage::connect(&url).await.unwrap();
    shared_calendar_contract(&storage).await;

    let user = storage.for_user("persisted-user").unwrap();
    let calendar = user.create_calendar("Personal", "UTC").await.unwrap();
    let event = user
        .create_event(
            &calendar.id,
            NewEvent {
                title: "Holiday".into(),
                description: None,
                location: None,
                time: EventTime::AllDay {
                    start: date(2026, 12, 25),
                    end_exclusive: date(2026, 12, 26),
                },
            },
        )
        .await
        .unwrap();
    storage.close().await;

    let reopened = Storage::connect(&url).await.unwrap();
    let user = reopened.for_user("persisted-user").unwrap();
    assert_eq!(
        user.get_calendar(&calendar.id).await.unwrap(),
        Some(calendar)
    );
    assert_eq!(user.get_event(&event.id).await.unwrap(), Some(event));
    reopened.close().await;
}

#[tokio::test]
async fn postgres_calendar_contract_when_configured() {
    let Ok(url) = std::env::var("FORGE_TEST_POSTGRES_URL") else {
        return;
    };
    let storage = Storage::connect(&url).await.unwrap();
    shared_calendar_contract(&storage).await;
    storage.close().await;
}

#[tokio::test]
async fn rejects_invalid_time_and_identity() {
    let storage = Storage::connect("sqlite::memory:").await.unwrap();
    assert!(matches!(
        storage.for_user("  "),
        Err(StorageError::EmptyUserId)
    ));
    let user = storage.for_user("alice").unwrap();
    assert!(matches!(
        user.create_calendar("x", "Mars/Phobos").await,
        Err(StorageError::InvalidTimeZone(_))
    ));
    let calendar = user.create_calendar("Home", "UTC").await.unwrap();
    let mut invalid = timed_event();
    invalid.time = EventTime::Timed {
        start: utc(2026, 11, 19, 15),
        end: utc(2026, 11, 19, 14),
        time_zone: "UTC".into(),
    };
    assert!(matches!(
        user.create_event(&calendar.id, invalid).await,
        Err(StorageError::InvalidTimeRange)
    ));
    let mut invalid_all_day = timed_event();
    invalid_all_day.time = EventTime::AllDay {
        start: date(2026, 11, 20),
        end_exclusive: date(2026, 11, 20),
    };
    assert!(matches!(
        user.create_event(&calendar.id, invalid_all_day).await,
        Err(StorageError::InvalidTimeRange)
    ));
    let mut submillisecond = timed_event();
    submillisecond.time = EventTime::Timed {
        start: utc(2026, 11, 19, 14).with_nanosecond(1).unwrap(),
        end: utc(2026, 11, 19, 15),
        time_zone: "UTC".into(),
    };
    assert!(matches!(
        user.create_event(&calendar.id, submillisecond).await,
        Err(StorageError::UnsupportedTimePrecision)
    ));
    let event = user
        .create_event(&calendar.id, timed_event())
        .await
        .unwrap();
    assert!(matches!(
        user.put_exception(
            &event.id,
            EventException {
                original_start: RecurrenceId::AllDay(date(2026, 11, 19)),
                replacement: None,
            },
        )
        .await,
        Err(StorageError::NotRecurring)
    ));
    user.set_recurrence(&event.id, "FREQ=WEEKLY").await.unwrap();
    assert!(matches!(
        user.put_exception(
            &event.id,
            EventException {
                original_start: RecurrenceId::Timed(
                    date(2026, 11, 26)
                        .and_hms_opt(9, 0, 0)
                        .unwrap()
                        .with_nanosecond(1)
                        .unwrap(),
                ),
                replacement: None,
            },
        )
        .await,
        Err(StorageError::UnsupportedTimePrecision)
    ));
    assert!(matches!(
        user.put_exception(
            &event.id,
            EventException {
                original_start: RecurrenceId::AllDay(date(2026, 11, 19)),
                replacement: None,
            },
        )
        .await,
        Err(StorageError::RecurrenceKindMismatch)
    ));
    storage.close().await;
}

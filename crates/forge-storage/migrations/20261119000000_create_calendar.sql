CREATE TABLE calendars (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    time_zone TEXT NOT NULL,
    CHECK (name <> '')
);

CREATE INDEX calendars_user_id_idx ON calendars (user_id);

CREATE TABLE events (
    id TEXT PRIMARY KEY,
    calendar_id TEXT NOT NULL REFERENCES calendars (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    time_kind TEXT NOT NULL,
    start_ms BIGINT,
    end_ms BIGINT,
    start_date TEXT,
    end_date_exclusive TEXT,
    time_zone TEXT,
    CHECK (title <> ''),
    CHECK (
        (time_kind = 'timed' AND start_ms IS NOT NULL AND end_ms IS NOT NULL
            AND end_ms > start_ms AND time_zone IS NOT NULL
            AND start_date IS NULL AND end_date_exclusive IS NULL)
        OR
        (time_kind = 'all_day' AND start_date IS NOT NULL
            AND end_date_exclusive IS NOT NULL AND end_date_exclusive > start_date
            AND start_ms IS NULL AND end_ms IS NULL AND time_zone IS NULL)
    )
);

CREATE INDEX events_calendar_id_idx ON events (calendar_id);
CREATE INDEX events_timed_range_idx ON events (calendar_id, start_ms, end_ms);
CREATE INDEX events_all_day_range_idx ON events (calendar_id, start_date, end_date_exclusive);

CREATE TABLE event_recurrence (
    event_id TEXT PRIMARY KEY REFERENCES events (id) ON DELETE CASCADE,
    rrule TEXT NOT NULL,
    local_start TEXT NOT NULL,
    time_zone TEXT,
    CHECK (rrule <> '')
);

CREATE TABLE event_exceptions (
    event_id TEXT NOT NULL REFERENCES event_recurrence (event_id) ON DELETE CASCADE,
    recurrence_id TEXT NOT NULL,
    cancelled BIGINT NOT NULL CHECK (cancelled IN (0, 1)),
    title TEXT,
    description TEXT,
    location TEXT,
    time_kind TEXT,
    start_ms BIGINT,
    end_ms BIGINT,
    start_date TEXT,
    end_date_exclusive TEXT,
    time_zone TEXT,
    PRIMARY KEY (event_id, recurrence_id),
    CHECK (recurrence_id <> ''),
    CHECK (
        (cancelled = 1 AND title IS NULL AND time_kind IS NULL
            AND description IS NULL AND location IS NULL
            AND start_ms IS NULL AND end_ms IS NULL
            AND start_date IS NULL AND end_date_exclusive IS NULL AND time_zone IS NULL)
        OR
        (cancelled = 0 AND title IS NOT NULL AND title <> '' AND (
            (time_kind = 'timed' AND start_ms IS NOT NULL AND end_ms IS NOT NULL
                AND end_ms > start_ms AND time_zone IS NOT NULL
                AND start_date IS NULL AND end_date_exclusive IS NULL)
            OR
            (time_kind = 'all_day' AND start_date IS NOT NULL
                AND end_date_exclusive IS NOT NULL AND end_date_exclusive > start_date
                AND start_ms IS NULL AND end_ms IS NULL AND time_zone IS NULL)
        ))
    )
);

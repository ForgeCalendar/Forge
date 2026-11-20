use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(CreateCalendarTables)]
    }
}

#[derive(DeriveMigrationName)]
struct CreateCalendarTables;

#[async_trait::async_trait]
impl MigrationTrait for CreateCalendarTables {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table("calendars")
                    .col(ColumnDef::new("id").text().not_null().primary_key())
                    .col(ColumnDef::new("user_id").text().not_null())
                    .col(ColumnDef::new("name").text().not_null())
                    .col(ColumnDef::new("time_zone").text().not_null())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("calendars_user_id_idx")
                    .table("calendars")
                    .col("user_id")
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("events")
                    .col(ColumnDef::new("id").text().not_null().primary_key())
                    .col(ColumnDef::new("calendar_id").text().not_null())
                    .col(ColumnDef::new("title").text().not_null())
                    .col(ColumnDef::new("description").text())
                    .col(ColumnDef::new("location").text())
                    .foreign_key(
                        ForeignKey::create()
                            .from("events", "calendar_id")
                            .to("calendars", "id")
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("events_calendar_id_idx")
                    .table("events")
                    .col("calendar_id")
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("event_times")
                    .col(ColumnDef::new("event_id").text().not_null().primary_key())
                    .col(ColumnDef::new("start_ms").big_integer())
                    .col(ColumnDef::new("end_ms").big_integer())
                    .col(ColumnDef::new("start_date").date())
                    .col(ColumnDef::new("end_date_exclusive").date())
                    .col(ColumnDef::new("time_zone").text())
                    .foreign_key(
                        ForeignKey::create()
                            .from("event_times", "event_id")
                            .to("events", "id")
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;
        for (name, columns) in [
            ("event_times_timed_range_idx", &["start_ms", "end_ms"][..]),
            (
                "event_times_all_day_range_idx",
                &["start_date", "end_date_exclusive"][..],
            ),
        ] {
            let mut index = Index::create();
            index.name(name).table("event_times");
            for column in columns {
                index.col(*column);
            }
            manager.create_index(index.to_owned()).await?;
        }

        manager
            .create_table(
                Table::create()
                    .table("event_recurrence")
                    .col(ColumnDef::new("event_id").text().not_null().primary_key())
                    .col(ColumnDef::new("rrule").text().not_null())
                    .col(ColumnDef::new("local_start").date_time())
                    .col(ColumnDef::new("start_date").date())
                    .col(ColumnDef::new("time_zone").text())
                    .foreign_key(
                        ForeignKey::create()
                            .from("event_recurrence", "event_id")
                            .to("events", "id")
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("event_exceptions")
                    .col(ColumnDef::new("id").text().not_null().primary_key())
                    .col(ColumnDef::new("event_id").text().not_null())
                    .col(ColumnDef::new("original_local_start").date_time())
                    .col(ColumnDef::new("original_start_date").date())
                    .col(ColumnDef::new("cancelled").boolean().not_null())
                    .col(ColumnDef::new("title").text())
                    .col(ColumnDef::new("description").text())
                    .col(ColumnDef::new("location").text())
                    .foreign_key(
                        ForeignKey::create()
                            .from("event_exceptions", "event_id")
                            .to("event_recurrence", "event_id")
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;
        for (name, column) in [
            ("exceptions_original_local_idx", "original_local_start"),
            ("exceptions_original_date_idx", "original_start_date"),
        ] {
            manager
                .create_index(
                    Index::create()
                        .name(name)
                        .table("event_exceptions")
                        .col("event_id")
                        .col(column)
                        .unique()
                        .to_owned(),
                )
                .await?;
        }

        manager
            .create_table(
                Table::create()
                    .table("event_exception_times")
                    .col(
                        ColumnDef::new("exception_id")
                            .text()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new("start_ms").big_integer())
                    .col(ColumnDef::new("end_ms").big_integer())
                    .col(ColumnDef::new("start_date").date())
                    .col(ColumnDef::new("end_date_exclusive").date())
                    .col(ColumnDef::new("time_zone").text())
                    .foreign_key(
                        ForeignKey::create()
                            .from("event_exception_times", "exception_id")
                            .to("event_exceptions", "id")
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        for table in [
            "event_exception_times",
            "event_exceptions",
            "event_recurrence",
            "event_times",
            "events",
            "calendars",
        ] {
            manager
                .drop_table(Table::drop().table(table).if_exists().to_owned())
                .await?;
        }
        Ok(())
    }
}

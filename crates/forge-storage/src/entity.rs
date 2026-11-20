use sea_orm::entity::prelude::*;

pub mod calendar {
    use super::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "calendars")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub id: String,
        pub user_id: String,
        pub name: String,
        pub time_zone: String,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod event {
    use super::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "events")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub id: String,
        pub calendar_id: String,
        pub title: String,
        pub description: Option<String>,
        pub location: Option<String>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod event_time {
    use super::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "event_times")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub event_id: String,
        pub start_ms: Option<i64>,
        pub end_ms: Option<i64>,
        pub start_date: Option<Date>,
        pub end_date_exclusive: Option<Date>,
        pub time_zone: Option<String>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod recurrence {
    use super::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "event_recurrence")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub event_id: String,
        pub rrule: String,
        pub local_start: Option<DateTime>,
        pub start_date: Option<Date>,
        pub time_zone: Option<String>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod exception {
    use super::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "event_exceptions")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub id: String,
        pub event_id: String,
        pub original_local_start: Option<DateTime>,
        pub original_start_date: Option<Date>,
        pub cancelled: bool,
        pub title: Option<String>,
        pub description: Option<String>,
        pub location: Option<String>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod exception_time {
    use super::*;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "event_exception_times")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub exception_id: String,
        pub start_ms: Option<i64>,
        pub end_ms: Option<i64>,
        pub start_date: Option<Date>,
        pub end_date_exclusive: Option<Date>,
        pub time_zone: Option<String>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

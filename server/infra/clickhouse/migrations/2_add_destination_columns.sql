-- Step 1: Drop materialized views and tables that depend on `location`
DROP VIEW IF EXISTS travelnest.mv_popular_destinations_mv;
DROP VIEW IF EXISTS travelnest.mv_demand_by_travel_date_mv;
DROP VIEW IF EXISTS travelnest.mv_user_search_summary_mv;

DROP TABLE IF EXISTS travelnest.mv_popular_destinations;
DROP TABLE IF EXISTS travelnest.mv_demand_by_travel_date;
DROP TABLE IF EXISTS travelnest.mv_user_search_summary;

-- Step 2: Add destination_id and destination_type to main search_logs table
ALTER TABLE travelnest.search_logs
    ADD COLUMN IF NOT EXISTS destination_id UUID AFTER user_id,
    ADD COLUMN IF NOT EXISTS destination_type LowCardinality(String) AFTER destination_id;

-- Step 3: Recreate popular destinations aggregate table and materialized view

CREATE TABLE IF NOT EXISTS travelnest.mv_popular_destinations
(
    destination_id   UUID,
    destination_type LowCardinality(String),
    date             Date,
    search_count     UInt64,
    unique_users     UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (destination_type, destination_id, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_popular_destinations_mv
TO travelnest.mv_popular_destinations
AS
SELECT
    destination_id,
    destination_type,
    toDate(search_time) AS date,
    count() AS search_count,
    uniqExact(user_id) AS unique_users
FROM travelnest.search_logs
WHERE is_deleted = 0
GROUP BY destination_id, destination_type, date;

-- Recreate demand-by-travel-date aggregate table and materialized view
DROP VIEW IF EXISTS travelnest.mv_demand_by_travel_date_mv;
DROP TABLE IF EXISTS travelnest.mv_demand_by_travel_date;

CREATE TABLE IF NOT EXISTS travelnest.mv_demand_by_travel_date
(
    check_in_date    Date,
    destination_id   UUID,
    destination_type LowCardinality(String),
    search_count     UInt64,
    avg_nights       Float64,
    avg_rooms        Float64,
    avg_guests       Float64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(check_in_date)
ORDER BY (check_in_date, destination_type, destination_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_demand_by_travel_date_mv
TO travelnest.mv_demand_by_travel_date
AS
SELECT
    check_in_date,
    destination_id,
    destination_type,
    count() AS search_count,
    avg(nights) AS avg_nights,
    avg(rooms) AS avg_rooms,
    avg(adults + children) AS avg_guests
FROM travelnest.search_logs
WHERE is_deleted = 0 AND check_in_date IS NOT NULL
GROUP BY check_in_date, destination_id, destination_type;

-- Step 6: Recreate user search summary table and materialized view using destinations

CREATE TABLE IF NOT EXISTS travelnest.mv_user_search_summary
(
    user_id             UUID,
    total_searches      UInt64,
    unique_locations    UInt64,
    locations_visited   Array(UUID),
    last_search_time    DateTime,
    first_search_time   DateTime
)
ENGINE = AggregatingMergeTree()
ORDER BY user_id;

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_user_search_summary_mv
TO travelnest.mv_user_search_summary
AS
SELECT
    user_id,
    count() AS total_searches,
    uniqExact(destination_id) AS unique_locations,
    groupArray(destination_id) AS locations_visited,
    max(search_time) AS last_search_time,
    min(search_time) AS first_search_time
FROM travelnest.search_logs
WHERE is_deleted = 0 AND user_id IS NOT NULL
GROUP BY user_id;


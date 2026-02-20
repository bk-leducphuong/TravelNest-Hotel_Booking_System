-- ============================================================================
-- ClickHouse Search Logs Schema - Simple Version
-- ============================================================================
-- Run once after ClickHouse is up:
--   docker exec -i travelnest-clickhouse clickhouse-client --multiquery < infra/clickhouse/init/01-create-search-logs.sql
--   or: curl 'http://localhost:8123/' --data-binary @infra/clickhouse/init/01-create-search-logs.sql

CREATE DATABASE IF NOT EXISTS travelnest;

-- ============================================================================
-- Main table: search_logs (append-only event log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.search_logs
(
    -- Core fields
    search_id       UUID,
    user_id         Nullable(UUID),
    location        String,
    search_time     DateTime DEFAULT now(),
    
    -- Search parameters
    adults          UInt32,
    children        UInt32 DEFAULT 0,
    rooms           UInt32,
    check_in_date   Nullable(Date),
    check_out_date  Nullable(Date),
    
    -- Computed: nights duration
    nights          UInt32 DEFAULT dateDiff('day', check_in_date, check_out_date),
    
    -- Advanced fields (commented - add later for conversion tracking)
    -- result_count     UInt32 DEFAULT 0,
    -- hotels_clicked   Array(UUID) DEFAULT [],
    -- booking_id       Nullable(UUID),
    -- min_price        Nullable(Decimal(10,2)),
    -- max_price        Nullable(Decimal(10,2)),
    -- device_type      LowCardinality(String) DEFAULT 'unknown',
    -- session_id       String DEFAULT '',
    
    -- Soft delete support
    is_deleted      UInt8 DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(search_time)
ORDER BY (location, search_time, search_id)
TTL search_time + INTERVAL 2 YEAR;  -- Auto-delete logs older than 2 years

-- ============================================================================
-- Materialized View 1: Popular destinations (demand analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.mv_popular_destinations
(
    location        String,
    date            Date,
    search_count    UInt64,
    unique_users    UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (location, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_popular_destinations_mv
TO travelnest.mv_popular_destinations
AS
SELECT
    location,
    toDate(search_time) as date,
    count() as search_count,
    uniqExact(user_id) as unique_users
FROM travelnest.search_logs
WHERE is_deleted = 0
GROUP BY location, date;

-- ============================================================================
-- Materialized View 2: Search patterns by travel dates (demand forecasting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.mv_demand_by_travel_date
(
    check_in_date   Date,
    location        String,
    search_count    UInt64,
    avg_nights      Float64,
    avg_rooms       Float64,
    avg_guests      Float64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(check_in_date)
ORDER BY (check_in_date, location);

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_demand_by_travel_date_mv
TO travelnest.mv_demand_by_travel_date
AS
SELECT
    check_in_date,
    location,
    count() as search_count,
    avg(nights) as avg_nights,
    avg(rooms) as avg_rooms,
    avg(adults + children) as avg_guests
FROM travelnest.search_logs
WHERE is_deleted = 0 AND check_in_date IS NOT NULL
GROUP BY check_in_date, location;

-- ============================================================================
-- Materialized View 3: User search history (personalization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.mv_user_search_summary
(
    user_id             UUID,
    total_searches      UInt64,
    unique_locations    UInt64,
    locations_visited   Array(String),
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
    count() as total_searches,
    uniqExact(location) as unique_locations,
    groupArray(location) as locations_visited,
    max(search_time) as last_search_time,
    min(search_time) as first_search_time
FROM travelnest.search_logs
WHERE is_deleted = 0 AND user_id IS NOT NULL
GROUP BY user_id;

-- ============================================================================
-- Materialized View 4: Peak search times (marketing optimization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.mv_search_time_patterns
(
    hour_of_day     UInt8,
    day_of_week     UInt8,
    search_count    UInt64
)
ENGINE = SummingMergeTree()
ORDER BY (day_of_week, hour_of_day);

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_search_time_patterns_mv
TO travelnest.mv_search_time_patterns
AS
SELECT
    toHour(search_time) as hour_of_day,
    toDayOfWeek(search_time) as day_of_week,
    count() as search_count
FROM travelnest.search_logs
WHERE is_deleted = 0
GROUP BY hour_of_day, day_of_week;

-- ============================================================================
-- Query examples (use these in your repository)
-- ============================================================================

-- Get popular destinations (last 30 days):
-- SELECT location, sum(search_count) as searches, sum(unique_users) as users
-- FROM travelnest.mv_popular_destinations
-- WHERE date >= today() - 30
-- GROUP BY location ORDER BY searches DESC LIMIT 10;

-- Get demand by travel date (next 90 days):
-- SELECT check_in_date, location, sum(search_count) as searches
-- FROM travelnest.mv_demand_by_travel_date
-- WHERE check_in_date BETWEEN today() AND today() + 90
-- GROUP BY check_in_date, location ORDER BY searches DESC;

-- Get user's favorite locations:
-- SELECT locations_visited, total_searches, last_search_time
-- FROM travelnest.mv_user_search_summary
-- WHERE user_id = 'xxx';

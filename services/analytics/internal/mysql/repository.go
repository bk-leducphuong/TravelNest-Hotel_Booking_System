package mysql

import (
	"context"
	"database/sql"
	"time"

	"github.com/travelnest/services/analytics/internal/model"
)

const day = 24 * time.Hour

// Repository reads and writes the analytics tables owned by this service.
//
// The schema is created by the application's Sequelize migrations
// (server/infra/database/migrations); this service only performs DML.
type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

const insertSearchLogSQL = `
INSERT IGNORE INTO analytics_search_logs
	(search_id, user_id, destination_id, destination_type, latitude, longitude, radius,
	 search_time, adults, children, rooms, check_in_date, check_out_date, nights,
	 is_deleted, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

func (r *Repository) InsertSearchLog(ctx context.Context, log model.SearchLog) error {
	_, err := r.db.ExecContext(
		ctx,
		insertSearchLogSQL,
		log.SearchID,
		nullableString(log.UserID),
		nullableString(log.DestinationID),
		log.DestinationType,
		nullableFloat(log.Latitude),
		nullableFloat(log.Longitude),
		nullableInt(log.Radius),
		log.SearchTime,
		log.Adults,
		log.Children,
		log.Rooms,
		nullableTime(log.CheckInDate),
		nullableTime(log.CheckOutDate),
		log.Nights,
		log.IsDeleted,
		log.CreatedAt,
		log.UpdatedAt,
	)
	return err
}

const insertHotelViewEventSQL = `
INSERT IGNORE INTO analytics_hotel_view_events
	(event_id, hotel_id, user_id, session_id, viewed_at, ip_address, user_agent,
	 created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

func (r *Repository) InsertHotelViewEvent(ctx context.Context, event model.HotelViewEvent) error {
	_, err := r.db.ExecContext(
		ctx,
		insertHotelViewEventSQL,
		event.EventID,
		event.HotelID,
		nullableString(event.UserID),
		event.SessionID,
		event.ViewedAt,
		event.IPAddress,
		event.UserAgent,
		event.CreatedAt,
		event.UpdatedAt,
	)
	return err
}

func (r *Repository) TrendingHotels(ctx context.Context, limit, days int) ([]model.TrendingHotel, error) {
	limit = clamp(limit, 10, 1, 100)
	days = clamp(days, 2, 1, 365)
	since := startOfDay(time.Now().UTC().Add(-time.Duration(days-1) * day))

	rows, err := r.db.QueryContext(
		ctx,
		`SELECT hotel_id, COUNT(*) AS views
		   FROM analytics_hotel_view_events
		  WHERE viewed_at >= ?
		  GROUP BY hotel_id
		  ORDER BY views DESC
		  LIMIT ?`,
		since,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.TrendingHotel
	for rows.Next() {
		var row model.TrendingHotel
		if err := rows.Scan(&row.HotelID, &row.Views); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *Repository) TrendingDestinations(ctx context.Context, limit, days int) ([]model.TrendingDestination, error) {
	limit = clamp(limit, 5, 1, 100)
	days = clamp(days, 30, 1, 365)
	since := startOfDay(time.Now().UTC().Add(-time.Duration(days-1) * day))

	rows, err := r.db.QueryContext(
		ctx,
		`SELECT destination_id,
		        destination_type,
		        COUNT(*) AS search_count,
		        COUNT(DISTINCT user_id) AS unique_users
		   FROM analytics_search_logs
		  WHERE is_deleted = 0
		    AND destination_id IS NOT NULL
		    AND search_time >= ?
		  GROUP BY destination_id, destination_type
		  ORDER BY search_count DESC
		  LIMIT ?`,
		since,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.TrendingDestination
	for rows.Next() {
		var (
			row             model.TrendingDestination
			destinationID   sql.NullString
			destinationType sql.NullString
		)
		if err := rows.Scan(&destinationID, &destinationType, &row.SearchCount, &row.UniqueUsers); err != nil {
			return nil, err
		}
		row.DestinationID = destinationID.String
		row.DestinationType = destinationType.String
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *Repository) SearchDemand(ctx context.Context, nextDays, limit int) ([]model.SearchDemand, error) {
	nextDays = clamp(nextDays, 90, 1, 365)
	limit = clamp(limit, 50, 1, 500)
	start := startOfDay(time.Now().UTC())
	end := start.Add(time.Duration(nextDays) * day)

	rows, err := r.db.QueryContext(
		ctx,
		`SELECT DATE_FORMAT(check_in_date, '%Y-%m-%d') AS check_in_date,
		        destination_id,
		        destination_type,
		        COUNT(*) AS search_count,
		        AVG(nights) AS avg_nights,
		        AVG(adults + children) AS avg_guests
		   FROM analytics_search_logs
		  WHERE is_deleted = 0
		    AND check_in_date >= ?
		    AND check_in_date <= ?
		    AND destination_id IS NOT NULL
		  GROUP BY DATE_FORMAT(check_in_date, '%Y-%m-%d'), destination_id, destination_type
		  ORDER BY search_count DESC
		  LIMIT ?`,
		start,
		end,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.SearchDemand
	for rows.Next() {
		var (
			row             model.SearchDemand
			checkInDate     sql.NullString
			destinationID   sql.NullString
			destinationType sql.NullString
		)
		if err := rows.Scan(
			&checkInDate,
			&destinationID,
			&destinationType,
			&row.SearchCount,
			&row.AvgNights,
			&row.AvgGuests,
		); err != nil {
			return nil, err
		}
		row.CheckInDate = checkInDate.String
		row.DestinationID = destinationID.String
		row.DestinationType = destinationType.String
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *Repository) UserSearchSummary(ctx context.Context, userID string) (*model.UserSearchSummary, error) {
	var (
		summary         model.UserSearchSummary
		firstSearchTime sql.NullTime
		lastSearchTime  sql.NullTime
	)

	err := r.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*), MIN(search_time), MAX(search_time)
		   FROM analytics_search_logs
		  WHERE user_id = ? AND is_deleted = 0`,
		userID,
	).Scan(&summary.TotalSearches, &firstSearchTime, &lastSearchTime)
	if err != nil {
		return nil, err
	}
	if summary.TotalSearches == 0 {
		return nil, nil
	}

	summary.UserID = userID
	if firstSearchTime.Valid {
		summary.FirstSearchTime = firstSearchTime.Time
	}
	if lastSearchTime.Valid {
		summary.LastSearchTime = lastSearchTime.Time
	}

	rows, err := r.db.QueryContext(
		ctx,
		`SELECT DISTINCT destination_id
		   FROM analytics_search_logs
		  WHERE user_id = ? AND is_deleted = 0 AND destination_id IS NOT NULL
		  ORDER BY destination_id`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summary.LocationsVisited = make([]string, 0)

	for rows.Next() {
		var destinationID string
		if err := rows.Scan(&destinationID); err != nil {
			return nil, err
		}
		summary.LocationsVisited = append(summary.LocationsVisited, destinationID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	summary.UniqueLocations = len(summary.LocationsVisited)
	return &summary, nil
}

func (r *Repository) UserSearches(ctx context.Context, userID string, limit int) ([]model.UserSearch, error) {
	limit = clamp(limit, 10, 1, 100)

	rows, err := r.db.QueryContext(
		ctx,
		`SELECT search_id, check_in_date, check_out_date, adults, children, rooms, search_time
		   FROM analytics_search_logs
		  WHERE user_id = ? AND is_deleted = 0
		  ORDER BY search_time DESC
		  LIMIT ?`,
		userID,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.UserSearch
	for rows.Next() {
		var (
			row          model.UserSearch
			checkInDate  sql.NullTime
			checkOutDate sql.NullTime
		)
		if err := rows.Scan(
			&row.SearchID,
			&checkInDate,
			&checkOutDate,
			&row.Adults,
			&row.Children,
			&row.Rooms,
			&row.SearchTime,
		); err != nil {
			return nil, err
		}
		if checkInDate.Valid {
			row.CheckInDate = &checkInDate.Time
		}
		if checkOutDate.Valid {
			row.CheckOutDate = &checkOutDate.Time
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

// PurgeSearchLogsBefore removes at most `batch` search logs older than `before`.
func (r *Repository) PurgeSearchLogsBefore(ctx context.Context, before time.Time, batch int) (int64, error) {
	result, err := r.db.ExecContext(
		ctx,
		`DELETE FROM analytics_search_logs WHERE search_time < ? LIMIT ?`,
		before,
		batch,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// PurgeHotelViewEventsBefore removes at most `batch` view events older than `before`.
func (r *Repository) PurgeHotelViewEventsBefore(ctx context.Context, before time.Time, batch int) (int64, error) {
	result, err := r.db.ExecContext(
		ctx,
		`DELETE FROM analytics_hotel_view_events WHERE viewed_at < ? LIMIT ?`,
		before,
		batch,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func nullableString(value *string) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableFloat(value *float64) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableInt(value *int) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableTime(value *time.Time) any {
	if value == nil {
		return nil
	}
	return *value
}

func clamp(value, fallback, min, max int) int {
	if value == 0 {
		value = fallback
	}
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

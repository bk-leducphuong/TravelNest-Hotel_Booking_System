package mongo

import (
	"context"
	"errors"
	"time"

	"github.com/travelnest/services/analytics/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const day = 24 * time.Hour

type Repository struct {
	searchLogs      *mongo.Collection
	hotelViewEvents *mongo.Collection
}

func NewRepository(db *mongo.Database) *Repository {
	return &Repository{
		searchLogs:      db.Collection("search_logs"),
		hotelViewEvents: db.Collection("hotel_view_events"),
	}
}

func (r *Repository) EnsureIndexes(ctx context.Context) error {
	if _, err := r.searchLogs.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "searchId", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "isDeleted", Value: 1}, {Key: "searchTime", Value: -1}}},
		{Keys: bson.D{{Key: "destinationId", Value: 1}, {Key: "destinationType", Value: 1}, {Key: "isDeleted", Value: 1}, {Key: "searchTime", Value: -1}}},
		{Keys: bson.D{{Key: "checkInDate", Value: 1}, {Key: "destinationId", Value: 1}, {Key: "destinationType", Value: 1}, {Key: "isDeleted", Value: 1}}},
		{Keys: bson.D{{Key: "searchTime", Value: 1}}, Options: options.Index().SetExpireAfterSeconds(730 * 24 * 60 * 60)},
	}); err != nil {
		return err
	}

	_, err := r.hotelViewEvents.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "eventId", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "hotelId", Value: 1}, {Key: "viewedAt", Value: -1}}},
		{Keys: bson.D{{Key: "viewedAt", Value: 1}}, Options: options.Index().SetExpireAfterSeconds(90 * 24 * 60 * 60)},
	})
	return err
}

func (r *Repository) InsertSearchLog(ctx context.Context, log model.SearchLog) error {
	_, err := r.searchLogs.InsertOne(ctx, log)
	if IsDuplicateKey(err) {
		return nil
	}
	return err
}

func (r *Repository) InsertHotelViewEvent(ctx context.Context, event model.HotelViewEvent) error {
	_, err := r.hotelViewEvents.InsertOne(ctx, event)
	if IsDuplicateKey(err) {
		return nil
	}
	return err
}

func (r *Repository) TrendingHotels(ctx context.Context, limit, days int) ([]model.TrendingHotel, error) {
	limit = clamp(limit, 10, 1, 100)
	days = clamp(days, 2, 1, 365)
	since := startOfDay(time.Now().UTC().Add(-time.Duration(days-1) * day))

	cursor, err := r.hotelViewEvents.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "viewedAt", Value: bson.D{{Key: "$gte", Value: since}}}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: "$hotelId"}, {Key: "views", Value: bson.D{{Key: "$sum", Value: 1}}}}}},
		{{Key: "$project", Value: bson.D{{Key: "_id", Value: 0}, {Key: "hotelId", Value: "$_id"}, {Key: "views", Value: 1}}}},
		{{Key: "$sort", Value: bson.D{{Key: "views", Value: -1}}}},
		{{Key: "$limit", Value: limit}},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var rows []model.TrendingHotel
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *Repository) TrendingDestinations(ctx context.Context, limit, days int) ([]model.TrendingDestination, error) {
	limit = clamp(limit, 5, 1, 100)
	days = clamp(days, 30, 1, 365)
	since := startOfDay(time.Now().UTC().Add(-time.Duration(days-1) * day))

	cursor, err := r.searchLogs.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "isDeleted", Value: false}, {Key: "destinationId", Value: bson.D{{Key: "$ne", Value: nil}}}, {Key: "searchTime", Value: bson.D{{Key: "$gte", Value: since}}}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: bson.D{{Key: "destinationId", Value: "$destinationId"}, {Key: "destinationType", Value: "$destinationType"}}}, {Key: "searchCount", Value: bson.D{{Key: "$sum", Value: 1}}}, {Key: "users", Value: bson.D{{Key: "$addToSet", Value: "$userId"}}}}}},
		{{Key: "$project", Value: bson.D{{Key: "_id", Value: 0}, {Key: "destinationId", Value: "$_id.destinationId"}, {Key: "destinationType", Value: "$_id.destinationType"}, {Key: "searchCount", Value: 1}, {Key: "uniqueUsers", Value: bson.D{{Key: "$size", Value: bson.D{{Key: "$filter", Value: bson.D{{Key: "input", Value: "$users"}, {Key: "as", Value: "userId"}, {Key: "cond", Value: bson.D{{Key: "$ne", Value: bson.A{"$$userId", nil}}}}}}}}}}}}},
		{{Key: "$sort", Value: bson.D{{Key: "searchCount", Value: -1}}}},
		{{Key: "$limit", Value: limit}},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var rows []model.TrendingDestination
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *Repository) SearchDemand(ctx context.Context, nextDays, limit int) ([]model.SearchDemand, error) {
	nextDays = clamp(nextDays, 90, 1, 365)
	limit = clamp(limit, 50, 1, 500)
	start := startOfDay(time.Now().UTC())
	end := start.Add(time.Duration(nextDays) * day)

	cursor, err := r.searchLogs.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "isDeleted", Value: false}, {Key: "checkInDate", Value: bson.D{{Key: "$gte", Value: start}, {Key: "$lte", Value: end}}}, {Key: "destinationId", Value: bson.D{{Key: "$ne", Value: nil}}}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: bson.D{{Key: "date", Value: bson.D{{Key: "$dateToString", Value: bson.D{{Key: "format", Value: "%Y-%m-%d"}, {Key: "date", Value: "$checkInDate"}}}}}, {Key: "destinationId", Value: "$destinationId"}, {Key: "destinationType", Value: "$destinationType"}}}, {Key: "searchCount", Value: bson.D{{Key: "$sum", Value: 1}}}, {Key: "avgNights", Value: bson.D{{Key: "$avg", Value: "$nights"}}}, {Key: "avgGuests", Value: bson.D{{Key: "$avg", Value: bson.D{{Key: "$add", Value: bson.A{"$adults", "$children"}}}}}}}}},
		{{Key: "$project", Value: bson.D{{Key: "_id", Value: 0}, {Key: "checkInDate", Value: "$_id.date"}, {Key: "destinationId", Value: "$_id.destinationId"}, {Key: "destinationType", Value: "$_id.destinationType"}, {Key: "searchCount", Value: 1}, {Key: "avgNights", Value: 1}, {Key: "avgGuests", Value: 1}}}},
		{{Key: "$sort", Value: bson.D{{Key: "searchCount", Value: -1}}}},
		{{Key: "$limit", Value: limit}},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var rows []model.SearchDemand
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *Repository) UserSearchSummary(ctx context.Context, userID string) (*model.UserSearchSummary, error) {
	cursor, err := r.searchLogs.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "userId", Value: userID}, {Key: "isDeleted", Value: false}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: "$userId"}, {Key: "totalSearches", Value: bson.D{{Key: "$sum", Value: 1}}}, {Key: "destinations", Value: bson.D{{Key: "$addToSet", Value: "$destinationId"}}}, {Key: "lastSearchTime", Value: bson.D{{Key: "$max", Value: "$searchTime"}}}, {Key: "firstSearchTime", Value: bson.D{{Key: "$min", Value: "$searchTime"}}}}}},
		{{Key: "$project", Value: bson.D{{Key: "_id", Value: 0}, {Key: "userId", Value: "$_id"}, {Key: "totalSearches", Value: 1}, {Key: "locationsVisited", Value: bson.D{{Key: "$filter", Value: bson.D{{Key: "input", Value: "$destinations"}, {Key: "as", Value: "destinationId"}, {Key: "cond", Value: bson.D{{Key: "$ne", Value: bson.A{"$$destinationId", nil}}}}}}}}, {Key: "lastSearchTime", Value: 1}, {Key: "firstSearchTime", Value: 1}}}},
		{{Key: "$addFields", Value: bson.D{{Key: "uniqueLocations", Value: bson.D{{Key: "$size", Value: "$locationsVisited"}}}}}},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var rows []model.UserSearchSummary
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &rows[0], nil
}

func (r *Repository) UserSearches(ctx context.Context, userID string, limit int) ([]model.UserSearch, error) {
	limit = clamp(limit, 10, 1, 100)
	opts := options.Find().SetSort(bson.D{{Key: "searchTime", Value: -1}}).SetLimit(int64(limit))
	cursor, err := r.searchLogs.Find(ctx, bson.D{{Key: "userId", Value: userID}, {Key: "isDeleted", Value: false}}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var rows []model.UserSearch
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

func IsDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	var writeException mongo.WriteException
	if errors.As(err, &writeException) {
		for _, writeError := range writeException.WriteErrors {
			if writeError.Code == 11000 {
				return true
			}
		}
	}
	return false
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

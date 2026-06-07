package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/travelnest/services/analytics/internal/model"
)

type RedisCache struct {
	client *redis.Client
}

func NewRedisCache(client *redis.Client) *RedisCache {
	return &RedisCache{client: client}
}

func NewRedisClient(redisURL string) (*redis.Client, error) {
	options, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	return redis.NewClient(options), nil
}

func (c *RedisCache) Close() error {
	return c.client.Close()
}

func (c *RedisCache) Ping(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

func (c *RedisCache) GetTrendingHotels(ctx context.Context, limit, days int) ([]model.TrendingHotel, bool, error) {
	var rows []model.TrendingHotel
	found, err := c.getJSON(ctx, trendingHotelsKey(limit, days), &rows)
	return rows, found, err
}

func (c *RedisCache) SetTrendingHotels(ctx context.Context, limit, days int, rows []model.TrendingHotel, ttl time.Duration) error {
	return c.setJSON(ctx, trendingHotelsKey(limit, days), rows, ttl)
}

func (c *RedisCache) GetTrendingDestinations(ctx context.Context, limit, days int) ([]model.TrendingDestination, bool, error) {
	var rows []model.TrendingDestination
	found, err := c.getJSON(ctx, trendingDestinationsKey(limit, days), &rows)
	return rows, found, err
}

func (c *RedisCache) SetTrendingDestinations(ctx context.Context, limit, days int, rows []model.TrendingDestination, ttl time.Duration) error {
	return c.setJSON(ctx, trendingDestinationsKey(limit, days), rows, ttl)
}

func (c *RedisCache) getJSON(ctx context.Context, key string, destination any) (bool, error) {
	value, err := c.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err := json.Unmarshal([]byte(value), destination); err != nil {
		return false, err
	}
	return true, nil
}

func (c *RedisCache) setJSON(ctx context.Context, key string, value any, ttl time.Duration) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, key, payload, ttl).Err()
}

func trendingHotelsKey(limit, days int) string {
	return fmt.Sprintf("analytics:trending:hotels:limit=%d:days=%d", limit, days)
}

func trendingDestinationsKey(limit, days int) string {
	return fmt.Sprintf("analytics:trending:destinations:limit=%d:days=%d", limit, days)
}

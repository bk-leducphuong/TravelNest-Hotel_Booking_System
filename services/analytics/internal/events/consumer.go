package events

import (
	"context"
	"log/slog"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/travelnest/services/analytics/internal/model"
	"github.com/travelnest/services/analytics/internal/mongo"
)

type Consumer struct {
	js     nats.JetStreamContext
	stream string
	repo   *mongo.Repository
	logger *slog.Logger
}

func NewConsumer(js nats.JetStreamContext, stream string, repo *mongo.Repository, logger *slog.Logger) *Consumer {
	return &Consumer{js: js, stream: stream, repo: repo, logger: logger}
}

func EnsureStream(js nats.JetStreamContext, stream string) error {
	if _, err := js.StreamInfo(stream); err == nil {
		return nil
	}
	_, err := js.AddStream(&nats.StreamConfig{
		Name:     stream,
		Subjects: []string{"analytics.>"},
		Storage:  nats.FileStorage,
	})
	return err
}

func (c *Consumer) Start(ctx context.Context) error {
	if err := c.ensureConsumer(SearchPerformedSubject, "analytics-search-writer"); err != nil {
		return err
	}
	if err := c.ensureConsumer(HotelViewedSubject, "analytics-hotel-view-writer"); err != nil {
		return err
	}

	go c.consume(ctx, SearchPerformedSubject, "analytics-search-writer", c.handleSearch)
	go c.consume(ctx, HotelViewedSubject, "analytics-hotel-view-writer", c.handleHotelViewed)
	return nil
}

func (c *Consumer) ensureConsumer(subject, durable string) error {
	if _, err := c.js.ConsumerInfo(c.stream, durable); err == nil {
		return nil
	}
	_, err := c.js.AddConsumer(c.stream, &nats.ConsumerConfig{
		Durable:       durable,
		FilterSubject: subject,
		AckPolicy:     nats.AckExplicitPolicy,
		MaxDeliver:    5,
		AckWait:       30 * time.Second,
	})
	return err
}

func (c *Consumer) consume(ctx context.Context, subject, durable string, handler func(context.Context, []byte) error) {
	sub, err := c.js.PullSubscribe(subject, durable, nats.Bind(c.stream, durable))
	if err != nil {
		c.logger.Error("failed to subscribe", "subject", subject, "durable", durable, "error", err)
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		messages, err := sub.Fetch(10, nats.Context(ctx), nats.MaxWait(2*time.Second))
		if err != nil {
			if err == nats.ErrTimeout || ctx.Err() != nil {
				continue
			}
			c.logger.Error("failed to fetch messages", "subject", subject, "error", err)
			time.Sleep(time.Second)
			continue
		}

		for _, msg := range messages {
			if err := handler(ctx, msg.Data); err != nil {
				c.logger.Error("failed to process message", "subject", subject, "error", err)
				if shouldDeadLetter(msg) {
					c.publishDeadLetter(subject, msg)
					_ = msg.Ack()
					continue
				}
				_ = msg.Nak()
				continue
			}
			_ = msg.Ack()
		}
	}
}

func (c *Consumer) handleSearch(ctx context.Context, data []byte) error {
	event, err := DecodeSearch(data)
	if err != nil {
		return err
	}
	return c.repo.InsertSearchLog(ctx, searchLogFromEvent(event))
}

func (c *Consumer) handleHotelViewed(ctx context.Context, data []byte) error {
	event, err := DecodeHotelViewed(data)
	if err != nil {
		return err
	}
	return c.repo.InsertHotelViewEvent(ctx, hotelViewFromEvent(event))
}

func (c *Consumer) publishDeadLetter(subject string, msg *nats.Msg) {
	deadLetterSubject := subject + ".dead_letter"
	if _, err := c.js.Publish(deadLetterSubject, msg.Data); err != nil {
		c.logger.Error("failed to publish dead letter", "subject", deadLetterSubject, "error", err)
	}
}

func shouldDeadLetter(msg *nats.Msg) bool {
	meta, err := msg.Metadata()
	return err == nil && meta.NumDelivered >= 5
}

func searchLogFromEvent(event SearchPerformed) model.SearchLog {
	now := time.Now().UTC()
	checkIn := datePtr(event.CheckInDate)
	checkOut := datePtr(event.CheckOutDate)

	return model.SearchLog{
		SearchID:        event.EventID,
		UserID:          event.UserID,
		DestinationID:   event.DestinationID,
		DestinationType: event.DestinationType,
		SearchTime:      event.OccurredAt,
		Adults:          event.Adults,
		Children:        event.Children,
		Rooms:           event.Rooms,
		CheckInDate:     checkIn,
		CheckOutDate:    checkOut,
		Nights:          calculateNights(checkIn, checkOut),
		IsDeleted:       false,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

func hotelViewFromEvent(event HotelViewed) model.HotelViewEvent {
	now := time.Now().UTC()
	return model.HotelViewEvent{
		EventID:   event.EventID,
		HotelID:   event.HotelID,
		UserID:    event.UserID,
		SessionID: event.SessionID,
		ViewedAt:  event.OccurredAt,
		IPAddress: event.IPAddress,
		UserAgent: event.UserAgent,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func datePtr(value *DateOnly) *time.Time {
	if value == nil || value.Time.IsZero() {
		return nil
	}
	t := value.Time.UTC()
	return &t
}

func calculateNights(checkIn, checkOut *time.Time) int {
	if checkIn == nil || checkOut == nil {
		return 0
	}
	start := time.Date(checkIn.Year(), checkIn.Month(), checkIn.Day(), 0, 0, 0, 0, time.UTC)
	end := time.Date(checkOut.Year(), checkOut.Month(), checkOut.Day(), 0, 0, 0, 0, time.UTC)
	nights := int(end.Sub(start) / (24 * time.Hour))
	if nights < 0 {
		return 0
	}
	return nights
}

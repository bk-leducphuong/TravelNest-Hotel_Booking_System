package service

import (
	"time"

	"github.com/travelnest/services/analytics/internal/events"
	"github.com/travelnest/services/analytics/internal/model"
)

const day = 24 * time.Hour

func SearchLogFromEvent(event events.SearchPerformed) model.SearchLog {
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

func HotelViewFromEvent(event events.HotelViewed) model.HotelViewEvent {
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

func datePtr(value *events.DateOnly) *time.Time {
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
	nights := int(end.Sub(start) / day)
	if nights < 0 {
		return 0
	}
	return nights
}

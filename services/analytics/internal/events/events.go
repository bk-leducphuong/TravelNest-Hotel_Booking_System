package events

import (
	"encoding/json"
	"errors"
	"time"
)

const (
	SearchPerformedSubject = "analytics.search.performed.v1"
	HotelViewedSubject     = "analytics.hotel.viewed.v1"
)

type Envelope struct {
	EventID       string          `json:"eventId"`
	EventType     string          `json:"eventType"`
	Version       int             `json:"version"`
	OccurredAt    time.Time       `json:"occurredAt"`
	Producer      string          `json:"producer"`
	CorrelationID string          `json:"correlationId"`
	Payload       json.RawMessage `json:"payload"`
}

type SearchPerformed struct {
	EventID         string    `json:"eventId"`
	OccurredAt      time.Time `json:"occurredAt"`
	UserID          *string   `json:"userId"`
	DestinationID   *string   `json:"destinationId"`
	DestinationType string    `json:"destinationType"`
	CheckInDate     *DateOnly `json:"checkInDate"`
	CheckOutDate    *DateOnly `json:"checkOutDate"`
	Adults          int       `json:"adults"`
	Children        int       `json:"children"`
	Rooms           int       `json:"rooms"`
}

type HotelViewed struct {
	EventID    string    `json:"eventId"`
	OccurredAt time.Time `json:"occurredAt"`
	HotelID    string    `json:"hotelId"`
	UserID     *string   `json:"userId"`
	SessionID  string    `json:"sessionId"`
	IPAddress  string    `json:"ipAddress"`
	UserAgent  string    `json:"userAgent"`
}

type DateOnly struct {
	Time time.Time
}

func (d *DateOnly) UnmarshalJSON(data []byte) error {
	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	if value == "" {
		return nil
	}

	parsed, err := parseDateOnly(value)
	if err != nil {
		return err
	}
	d.Time = parsed
	return nil
}

func parseDateOnly(value string) (time.Time, error) {
	if parsed, err := time.Parse("2006-01-02", value); err == nil {
		return parsed, nil
	}

	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}, err
	}
	year, month, day := parsed.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC), nil
}

func DecodeSearch(data []byte) (SearchPerformed, error) {
	var event SearchPerformed
	if err := decodeEvent(data, SearchPerformedSubject, &event); err != nil {
		return event, err
	}
	if event.EventID == "" || event.OccurredAt.IsZero() {
		return event, errors.New("missing eventId or occurredAt")
	}
	if event.Adults < 0 || event.Children < 0 || event.Rooms < 1 {
		return event, errors.New("invalid guest or room counts")
	}
	return event, nil
}

func DecodeHotelViewed(data []byte) (HotelViewed, error) {
	var event HotelViewed
	if err := decodeEvent(data, HotelViewedSubject, &event); err != nil {
		return event, err
	}
	if event.EventID == "" || event.OccurredAt.IsZero() || event.HotelID == "" {
		return event, errors.New("missing eventId, occurredAt, or hotelId")
	}
	return event, nil
}

func decodeEvent(data []byte, expectedType string, target interface{}) error {
	var envelope Envelope
	if err := json.Unmarshal(data, &envelope); err == nil && envelope.Payload != nil {
		if envelope.Version != 1 || envelope.EventType != expectedType {
			return errors.New("unsupported event type or version")
		}
		if err := json.Unmarshal(envelope.Payload, target); err != nil {
			return err
		}
		switch t := target.(type) {
		case *SearchPerformed:
			t.EventID = first(t.EventID, envelope.EventID)
			t.OccurredAt = firstTime(t.OccurredAt, envelope.OccurredAt)
		case *HotelViewed:
			t.EventID = first(t.EventID, envelope.EventID)
			t.OccurredAt = firstTime(t.OccurredAt, envelope.OccurredAt)
		}
		return nil
	}
	return json.Unmarshal(data, target)
}

func first(value, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}

func firstTime(value, fallback time.Time) time.Time {
	if !value.IsZero() {
		return value
	}
	return fallback
}

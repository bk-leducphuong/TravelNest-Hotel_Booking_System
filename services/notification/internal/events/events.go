package events

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/travelnest/services/notification/internal/model"
)

const (
	PaymentSucceededSubject = "payment.payment.succeeded.v1"
	PaymentRefundSubject    = "payment.refund.created.v1"
	PayoutCompletedSubject  = "payment.payout.completed.v1"
	PayoutFailedSubject     = "payment.payout.failed.v1"
	BookingExpiredSubject   = "booking.booking.expired.v1"
	EmailRequestedSubject   = "notification.email.requested.v1"
	TestInAppSubject        = "notification.test.inapp.requested.v1"
	RealtimeDispatchSubject = "notification.realtime.dispatch.v1"
)

type Envelope struct {
	EventID        string          `json:"eventId"`
	EventType      string          `json:"eventType"`
	Version        int             `json:"version"`
	OccurredAt     time.Time       `json:"occurredAt"`
	Producer       string          `json:"producer"`
	CorrelationID  string          `json:"correlationId"`
	IdempotencyKey string          `json:"idempotencyKey"`
	Payload        json.RawMessage `json:"payload"`
}

type PaymentSucceeded struct {
	EventID        string    `json:"eventId"`
	OccurredAt     time.Time `json:"occurredAt"`
	BuyerID        string    `json:"buyerId"`
	HotelID        string    `json:"hotelId"`
	BookingCode    string    `json:"bookingCode"`
	BookingID      string    `json:"bookingId"`
	CheckInDate    string    `json:"checkInDate"`
	CheckOutDate   string    `json:"checkOutDate"`
	NumberOfGuests int       `json:"numberOfGuests"`
	BookedRooms    any       `json:"bookedRooms"`
	Amount         int64     `json:"amount"`
	Currency       string    `json:"currency"`
}

type RefundCreated struct {
	EventID      string    `json:"eventId"`
	OccurredAt   time.Time `json:"occurredAt"`
	BuyerID      string    `json:"buyerId"`
	HotelID      string    `json:"hotelId"`
	BookingCode  string    `json:"bookingCode"`
	RefundAmount int64     `json:"refundAmount"`
	Currency     string    `json:"currency"`
}

type PayoutStatus struct {
	EventID       string    `json:"eventId"`
	OccurredAt    time.Time `json:"occurredAt"`
	HotelID       string    `json:"hotelId"`
	TransactionID string    `json:"transactionId"`
	PayoutID      string    `json:"payoutId"`
	Amount        int64     `json:"amount"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"`
}

type BookingExpired struct {
	EventID      string    `json:"eventId"`
	OccurredAt   time.Time `json:"occurredAt"`
	BuyerID      string    `json:"buyerId"`
	HotelID      string    `json:"hotelId"`
	BookingID    string    `json:"bookingId"`
	BookingCode  string    `json:"bookingCode"`
	CheckInDate  string    `json:"checkInDate"`
	CheckOutDate string    `json:"checkOutDate"`
	PaymentDueAt string    `json:"paymentDueAt"`
}

type EmailRequested struct {
	EventID    string         `json:"eventId"`
	OccurredAt time.Time      `json:"occurredAt"`
	Type       string         `json:"type"`
	Data       map[string]any `json:"data"`
}

type TestInAppRequested struct {
	EventID            string         `json:"eventId"`
	OccurredAt         time.Time      `json:"occurredAt"`
	ReceiverIDs        []string       `json:"receiverIds"`
	Title              string         `json:"title"`
	Message            string         `json:"message"`
	Category           string         `json:"category"`
	Priority           string         `json:"priority"`
	ActionURL          string         `json:"actionUrl"`
	ActionLabel        string         `json:"actionLabel"`
	Metadata           map[string]any `json:"metadata"`
	SenderID           string         `json:"senderId"`
	TriggeredByAdminID string         `json:"triggeredByAdminId"`
}

type RealtimeDispatch struct {
	EventID       string                       `json:"eventId"`
	OccurredAt    time.Time                    `json:"occurredAt"`
	Notification  model.Notification           `json:"notification"`
	Targets       []model.SocketDispatchTarget `json:"targets"`
	UnreadCount   int                          `json:"unreadCount"`
	ReceiverID    string                       `json:"receiverId"`
	ReceiverRoles []string                     `json:"receiverRoles,omitempty"`
}

func DecodePaymentSucceeded(data []byte) (PaymentSucceeded, error) {
	var event PaymentSucceeded
	if err := decodeEvent(data, PaymentSucceededSubject, &event); err != nil {
		return event, err
	}
	if event.EventID == "" || event.BuyerID == "" || event.HotelID == "" || event.BookingCode == "" {
		return event, errors.New("missing required payment success fields")
	}
	return event, nil
}

func DecodeRefundCreated(data []byte) (RefundCreated, error) {
	var event RefundCreated
	if err := decodeEvent(data, PaymentRefundSubject, &event); err != nil {
		return event, err
	}
	if event.EventID == "" || event.BuyerID == "" {
		return event, errors.New("missing required refund fields")
	}
	return event, nil
}

func DecodePayoutStatus(data []byte, expectedSubject string) (PayoutStatus, error) {
	var event PayoutStatus
	if err := decodeEvent(data, expectedSubject, &event); err != nil {
		return event, err
	}
	if event.EventID == "" || event.HotelID == "" || event.Status == "" {
		return event, errors.New("missing required payout fields")
	}
	return event, nil
}

func DecodeBookingExpired(data []byte) (BookingExpired, error) {
	var event BookingExpired
	if err := decodeEvent(data, BookingExpiredSubject, &event); err != nil {
		return event, err
	}
	if event.EventID == "" || event.BuyerID == "" || event.BookingCode == "" {
		return event, errors.New("missing required booking expiry fields")
	}
	return event, nil
}

func DecodeEmailRequested(data []byte) (EmailRequested, error) {
	var event EmailRequested
	if err := decodeEvent(data, EmailRequestedSubject, &event); err != nil {
		return event, err
	}
	if event.EventID == "" || event.Type == "" {
		return event, errors.New("missing required email request fields")
	}
	return event, nil
}

func DecodeTestInAppRequested(data []byte) (TestInAppRequested, error) {
	var event TestInAppRequested
	if err := decodeEvent(data, TestInAppSubject, &event); err != nil {
		return event, err
	}
	if event.EventID == "" || len(event.ReceiverIDs) == 0 || event.Title == "" || event.Message == "" {
		return event, errors.New("missing required test notification fields")
	}
	return event, nil
}

func decodeEvent(data []byte, expectedType string, target any) error {
	var envelope Envelope
	if err := json.Unmarshal(data, &envelope); err == nil && envelope.Payload != nil {
		if envelope.Version != 1 || envelope.EventType != expectedType {
			return errors.New("unsupported event type or version")
		}
		if err := json.Unmarshal(envelope.Payload, target); err != nil {
			return err
		}
		switch t := target.(type) {
		case *PaymentSucceeded:
			t.EventID = first(t.EventID, envelope.EventID)
			t.OccurredAt = firstTime(t.OccurredAt, envelope.OccurredAt)
		case *RefundCreated:
			t.EventID = first(t.EventID, envelope.EventID)
			t.OccurredAt = firstTime(t.OccurredAt, envelope.OccurredAt)
		case *PayoutStatus:
			t.EventID = first(t.EventID, envelope.EventID)
			t.OccurredAt = firstTime(t.OccurredAt, envelope.OccurredAt)
		case *BookingExpired:
			t.EventID = first(t.EventID, envelope.EventID)
			t.OccurredAt = firstTime(t.OccurredAt, envelope.OccurredAt)
		case *EmailRequested:
			t.EventID = first(t.EventID, envelope.EventID)
			t.OccurredAt = firstTime(t.OccurredAt, envelope.OccurredAt)
		case *TestInAppRequested:
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

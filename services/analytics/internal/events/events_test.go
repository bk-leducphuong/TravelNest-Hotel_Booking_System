package events

import (
	"testing"
)

func TestDecodeSearchEnvelopeAndMapNights(t *testing.T) {
	data := []byte(`{
		"eventId":"evt-1",
		"eventType":"analytics.search.performed.v1",
		"version":1,
		"occurredAt":"2026-06-01T10:30:00Z",
		"producer":"travelnest-api",
		"payload":{
			"userId":"user-1",
			"destinationId":"dest-1",
			"destinationType":"city",
			"checkInDate":"2026-07-01",
			"checkOutDate":"2026-07-04",
			"adults":2,
			"children":1,
			"rooms":1
		}
	}`)

	event, err := DecodeSearch(data)
	if err != nil {
		t.Fatalf("DecodeSearch() error = %v", err)
	}

	doc := searchLogFromEvent(event)
	if doc.SearchID != "evt-1" {
		t.Fatalf("SearchID = %q, want evt-1", doc.SearchID)
	}
	if doc.CheckInDate == nil || doc.CheckOutDate == nil {
		t.Fatal("expected parsed check-in and check-out dates")
	}
	if doc.Nights != 3 {
		t.Fatalf("Nights = %d, want 3", doc.Nights)
	}
	if doc.IsDeleted {
		t.Fatal("expected isDeleted=false")
	}
}

func TestDecodeSearchAcceptsISODateTimesForDateOnlyFields(t *testing.T) {
	data := []byte(`{
		"eventId":"dbc361eb-fdd0-4962-b742-9a5c761e9e7e",
		"eventType":"analytics.search.performed.v1",
		"version":1,
		"occurredAt":"2026-06-06T04:56:25.880Z",
		"producer":"travelnest-api",
		"payload":{
			"userId":null,
			"destinationId":"019e92d7-e6aa-7474-b26b-b03fab24c901",
			"destinationType":"city",
			"checkInDate":"2026-06-07T00:00:00.000Z",
			"checkOutDate":"2026-06-08T00:00:00.000Z",
			"adults":2,
			"children":0,
			"rooms":1
		}
	}`)

	event, err := DecodeSearch(data)
	if err != nil {
		t.Fatalf("DecodeSearch() error = %v", err)
	}

	doc := searchLogFromEvent(event)
	if doc.CheckInDate == nil || doc.CheckInDate.Format("2006-01-02") != "2026-06-07" {
		t.Fatalf("CheckInDate = %v, want 2026-06-07", doc.CheckInDate)
	}
	if doc.CheckOutDate == nil || doc.CheckOutDate.Format("2006-01-02") != "2026-06-08" {
		t.Fatalf("CheckOutDate = %v, want 2026-06-08", doc.CheckOutDate)
	}
	if doc.Nights != 1 {
		t.Fatalf("Nights = %d, want 1", doc.Nights)
	}
}

func TestDecodeSearchRejectsUnsupportedVersion(t *testing.T) {
	data := []byte(`{
		"eventId":"evt-1",
		"eventType":"analytics.search.performed.v1",
		"version":2,
		"occurredAt":"2026-06-01T10:30:00Z",
		"payload":{}
	}`)

	if _, err := DecodeSearch(data); err == nil {
		t.Fatal("expected unsupported version error")
	}
}

func TestDecodeHotelViewedDirectPayload(t *testing.T) {
	data := []byte(`{
		"eventId":"evt-2",
		"occurredAt":"2026-06-01T10:30:00Z",
		"hotelId":"hotel-1",
		"userId":null,
		"sessionId":"session-1",
		"ipAddress":"127.0.0.1",
		"userAgent":"browser"
	}`)

	event, err := DecodeHotelViewed(data)
	if err != nil {
		t.Fatalf("DecodeHotelViewed() error = %v", err)
	}

	doc := hotelViewFromEvent(event)
	if doc.EventID != "evt-2" || doc.HotelID != "hotel-1" || doc.ViewedAt.IsZero() {
		t.Fatalf("unexpected mapped hotel view document: %+v", doc)
	}
}

func TestCalculateNightsNeverNegative(t *testing.T) {
	data := []byte(`{
		"eventId":"evt-1",
		"occurredAt":"2026-06-01T10:30:00Z",
		"destinationType":"city",
		"checkInDate":"2026-07-04",
		"checkOutDate":"2026-07-01",
		"adults":1,
		"rooms":1
	}`)

	event, err := DecodeSearch(data)
	if err != nil {
		t.Fatalf("DecodeSearch() error = %v", err)
	}
	if doc := searchLogFromEvent(event); doc.Nights != 0 {
		t.Fatalf("Nights = %d, want 0", doc.Nights)
	}
}

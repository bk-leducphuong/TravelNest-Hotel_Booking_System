package events

import (
	"encoding/json"
	"testing"
	"time"
)

func TestDecodeImageUploaded(t *testing.T) {
	payload := ImageUploadedPayload{
		ImageID:   "image-id",
		Bucket:    "uploads",
		ObjectKey: "hotel/hotel-id/image.jpg",
		MimeType:  "image/jpeg",
	}
	payloadBody, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	body, err := json.Marshal(Envelope{
		EventID:    "event-id",
		EventType:  ImageUploadedSubject,
		Version:    1,
		OccurredAt: time.Now().UTC(),
		Producer:   "test",
		Payload:    payloadBody,
	})
	if err != nil {
		t.Fatal(err)
	}

	event, err := DecodeImageUploaded(body)
	if err != nil {
		t.Fatal(err)
	}
	if event.ImageID != payload.ImageID {
		t.Fatalf("ImageID = %q, want %q", event.ImageID, payload.ImageID)
	}
}

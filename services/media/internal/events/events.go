package events

import (
	"encoding/json"
	"errors"
	"time"
)

const ImageUploadedSubject = "media.image.uploaded.v1"

type Envelope struct {
	EventID        string          `json:"eventId"`
	EventType      string          `json:"eventType"`
	Version        int             `json:"version"`
	OccurredAt     time.Time       `json:"occurredAt"`
	Producer       string          `json:"producer"`
	CorrelationID  *string         `json:"correlationId"`
	IdempotencyKey *string         `json:"idempotencyKey"`
	Payload        json.RawMessage `json:"payload"`
}

type ImageUploadedPayload struct {
	ImageID    string `json:"imageId"`
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`
	Bucket     string `json:"bucket"`
	ObjectKey  string `json:"objectKey"`
	MimeType   string `json:"mimeType"`
	IsPrimary  bool   `json:"isPrimary"`
}

type ImageUploaded struct {
	EventID    string
	OccurredAt time.Time
	ImageUploadedPayload
}

func DecodeImageUploaded(data []byte) (ImageUploaded, error) {
	var envelope Envelope
	if err := json.Unmarshal(data, &envelope); err != nil {
		return ImageUploaded{}, err
	}
	if envelope.EventType != ImageUploadedSubject || envelope.Version != 1 {
		return ImageUploaded{}, errors.New("unsupported media event")
	}
	var payload ImageUploadedPayload
	if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
		return ImageUploaded{}, err
	}
	if envelope.EventID == "" || payload.ImageID == "" || payload.Bucket == "" || payload.ObjectKey == "" {
		return ImageUploaded{}, errors.New("invalid image uploaded payload")
	}
	return ImageUploaded{
		EventID:              envelope.EventID,
		OccurredAt:           envelope.OccurredAt,
		ImageUploadedPayload: payload,
	}, nil
}

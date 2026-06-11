package events

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
)

type Publisher struct {
	js nats.JetStreamContext
}

func NewPublisher(js nats.JetStreamContext) *Publisher {
	return &Publisher{js: js}
}

func EnsureStream(js nats.JetStreamContext, stream string) error {
	if _, err := js.StreamInfo(stream); err == nil {
		return nil
	}
	_, err := js.AddStream(&nats.StreamConfig{
		Name:     stream,
		Subjects: []string{"media.>"},
		Storage:  nats.FileStorage,
	})
	return err
}

func (p *Publisher) PublishImageUploaded(ctx context.Context, payload ImageUploadedPayload) (string, error) {
	eventID := uuid.NewString()
	envelope := Envelope{
		EventID:    eventID,
		EventType:  ImageUploadedSubject,
		Version:    1,
		OccurredAt: time.Now().UTC(),
		Producer:   "media-service",
		Payload:    mustMarshal(payload),
	}
	body, err := json.Marshal(envelope)
	if err != nil {
		return "", err
	}
	_, err = p.js.Publish(ImageUploadedSubject, body, nats.MsgId(eventID), nats.Context(ctx))
	if err != nil {
		return "", err
	}
	return eventID, nil
}

func mustMarshal(value any) json.RawMessage {
	body, err := json.Marshal(value)
	if err != nil {
		return json.RawMessage("{}")
	}
	return body
}

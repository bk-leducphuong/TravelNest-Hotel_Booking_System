package events

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"github.com/travelnest/services/media/internal/imageproc"
	"github.com/travelnest/services/media/internal/model"
	mediaMySQL "github.com/travelnest/services/media/internal/mysql"
	"github.com/travelnest/services/media/internal/storage"
)

type Consumer struct {
	js      nats.JetStreamContext
	stream  string
	repo    *mediaMySQL.Repository
	storage *storage.Client
	logger  *slog.Logger
}

func NewConsumer(js nats.JetStreamContext, stream string, repo *mediaMySQL.Repository, storage *storage.Client, logger *slog.Logger) *Consumer {
	return &Consumer{js: js, stream: stream, repo: repo, storage: storage, logger: logger}
}

func (c *Consumer) Start(ctx context.Context) error {
	if err := c.ensureConsumer(ImageUploadedSubject, "media-image-processor"); err != nil {
		return err
	}
	go c.consume(ctx, ImageUploadedSubject, "media-image-processor")
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

func (c *Consumer) consume(ctx context.Context, subject, durable string) {
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
		messages, err := sub.Fetch(5, nats.MaxWait(2*time.Second))
		if err != nil {
			if err == nats.ErrTimeout || ctx.Err() != nil {
				continue
			}
			c.logger.Error("failed to fetch messages", "subject", subject, "error", err)
			time.Sleep(time.Second)
			continue
		}
		for _, msg := range messages {
			if err := c.process(ctx, msg.Data); err != nil {
				c.logger.Error("failed to process media event", "subject", subject, "error", err)
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

func (c *Consumer) process(ctx context.Context, data []byte) error {
	event, err := DecodeImageUploaded(data)
	if err != nil {
		return err
	}
	body, err := c.storage.Download(ctx, event.Bucket, event.ObjectKey)
	if err != nil {
		return err
	}
	metadata := imageproc.DecodeMetadata(body)
	variantKey := replaceExtension(event.ObjectKey, "_medium.webp")
	variantBody := imageproc.MediumWebPPlaceholder(body)
	if _, err := c.storage.Upload(ctx, variantKey, variantBody, "image/webp"); err != nil {
		return err
	}
	if err := c.repo.CreateVariantIfMissing(ctx, model.ImageVariant{
		ID:          uuid.NewString(),
		ImageID:     event.ImageID,
		VariantType: "medium_webp",
		BucketName:  c.storage.Bucket(),
		ObjectKey:   variantKey,
		FileSize:    int64(len(variantBody)),
		Width:       metadata.Width,
		Height:      metadata.Height,
	}); err != nil {
		return err
	}
	return c.repo.MarkImageProcessed(ctx, event.ImageID, metadata.Width, metadata.Height)
}

func replaceExtension(objectKey, suffix string) string {
	index := strings.LastIndex(objectKey, ".")
	if index == -1 {
		return objectKey + suffix
	}
	return objectKey[:index] + suffix
}

func (c *Consumer) publishDeadLetter(subject string, msg *nats.Msg) {
	if _, err := c.js.Publish(subject+".dead_letter", msg.Data); err != nil {
		c.logger.Error("failed to publish dead letter", "subject", subject, "error", err)
	}
}

func shouldDeadLetter(msg *nats.Msg) bool {
	meta, err := msg.Metadata()
	return err == nil && meta.NumDelivered >= 5
}

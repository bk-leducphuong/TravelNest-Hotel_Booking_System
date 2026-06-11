package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/nats-io/nats.go"
	notificationEmail "github.com/travelnest/services/notification/internal/email"
	"github.com/travelnest/services/notification/internal/model"
	notificationMySQL "github.com/travelnest/services/notification/internal/mysql"
)

type Consumer struct {
	js     nats.JetStreamContext
	stream string
	mailer *notificationEmail.Mailer
	repo   *notificationMySQL.Repository
	logger *slog.Logger
}

func NewConsumer(js nats.JetStreamContext, stream string, mailer *notificationEmail.Mailer, repo *notificationMySQL.Repository, logger *slog.Logger) *Consumer {
	return &Consumer{js: js, stream: stream, mailer: mailer, repo: repo, logger: logger}
}

func EnsureStream(js nats.JetStreamContext, stream string) error {
	if _, err := js.StreamInfo(stream); err == nil {
		return nil
	}
	_, err := js.AddStream(&nats.StreamConfig{
		Name:     stream,
		Subjects: []string{"booking.>", "payment.>", "notification.>"},
		Storage:  nats.FileStorage,
	})
	return err
}

func (c *Consumer) Start(ctx context.Context) error {
	configs := []struct {
		subject string
		durable string
		handler func(context.Context, []byte) error
	}{
		{PaymentSucceededSubject, "notification-payment-succeeded", c.handlePaymentSucceeded},
		{PaymentRefundSubject, "notification-payment-refund", c.handleRefundCreated},
		{PayoutCompletedSubject, "notification-payout-completed", c.handlePayoutCompleted},
		{PayoutFailedSubject, "notification-payout-failed", c.handlePayoutFailed},
		{BookingExpiredSubject, "notification-booking-expired", c.handleBookingExpired},
		{EmailRequestedSubject, "notification-email-requested", c.handleEmailRequested},
		{TestInAppSubject, "notification-test-inapp-requested", c.handleTestInAppRequested},
	}

	for _, cfg := range configs {
		if err := c.ensureConsumer(cfg.subject, cfg.durable); err != nil {
			return err
		}
		c.logger.Info("starting notification consumer", "stream", c.stream, "subject", cfg.subject, "durable", cfg.durable)
		go c.consume(ctx, cfg.subject, cfg.durable, cfg.handler)
	}

	return nil
}

func (c *Consumer) ensureConsumer(subject, durable string) error {
	if _, err := c.js.ConsumerInfo(c.stream, durable); err == nil {
		c.logger.Debug("notification consumer already exists", "stream", c.stream, "subject", subject, "durable", durable)
		return nil
	}
	_, err := c.js.AddConsumer(c.stream, &nats.ConsumerConfig{
		Durable:       durable,
		FilterSubject: subject,
		AckPolicy:     nats.AckExplicitPolicy,
		MaxDeliver:    5,
		AckWait:       30 * time.Second,
	})
	if err == nil {
		c.logger.Info("notification consumer created", "stream", c.stream, "subject", subject, "durable", durable)
	}
	return err
}

func (c *Consumer) consume(ctx context.Context, subject, durable string, handler func(context.Context, []byte) error) {
	sub, err := c.js.PullSubscribe(subject, durable, nats.Bind(c.stream, durable))
	if err != nil {
		c.logger.Error("failed to subscribe", "subject", subject, "durable", durable, "error", err)
		return
	}
	c.logger.Info("notification consumer subscribed", "stream", c.stream, "subject", subject, "durable", durable)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		messages, err := sub.Fetch(10, nats.MaxWait(2*time.Second))
		if err != nil {
			if err == nats.ErrTimeout || ctx.Err() != nil {
				continue
			}
			c.logger.Error("failed to fetch messages", "subject", subject, "error", err)
			time.Sleep(time.Second)
			continue
		}
		if len(messages) > 0 {
			c.logger.Debug("fetched notification messages", "subject", subject, "durable", durable, "count", len(messages))
		}

		for _, msg := range messages {
			metaFields := messageLogFields(msg)
			c.logger.Info("processing notification message", append([]any{"subject", subject, "durable", durable, "bytes", len(msg.Data)}, metaFields...)...)

			if err := handler(ctx, msg.Data); err != nil {
				c.logger.Error("failed to process message", append([]any{"subject", subject, "durable", durable, "error", err, "payload", truncatePayload(msg.Data)}, metaFields...)...)
				if shouldDeadLetter(msg) {
					c.logger.Warn("dead-lettering notification message", append([]any{"subject", subject, "durable", durable}, metaFields...)...)
					c.publishDeadLetter(subject, msg)
					_ = msg.Ack()
					continue
				}
				c.logger.Warn("nacking notification message", append([]any{"subject", subject, "durable", durable}, metaFields...)...)
				_ = msg.Nak()
				continue
			}
			c.logger.Info("notification message processed", append([]any{"subject", subject, "durable", durable}, metaFields...)...)
			_ = msg.Ack()
		}
	}
}

func (c *Consumer) handlePaymentSucceeded(ctx context.Context, data []byte) error {
	event, err := DecodePaymentSucceeded(data)
	if err != nil {
		return err
	}

	hotel, err := c.repo.FindHotelOwnerInfo(ctx, event.HotelID)
	if err != nil {
		return err
	}

	ownerNotification := buildNotification(
		hotel.OwnerID,
		stringRef(event.BuyerID),
		"booking_new",
		"booking",
		"high",
		"New Booking #"+event.BookingCode,
		"You have received a new booking from Guest for "+itoa(event.NumberOfGuests)+" guest(s), checking in on "+event.CheckInDate+".",
		map[string]any{
			"eventId":        event.EventID,
			"bookingCode":    event.BookingCode,
			"bookingId":      event.BookingID,
			"checkInDate":    event.CheckInDate,
			"checkOutDate":   event.CheckOutDate,
			"numberOfGuests": event.NumberOfGuests,
			"bookedRooms":    event.BookedRooms,
			"amount":         event.Amount,
			"currency":       event.Currency,
		},
		stringRef("booking"),
		emptyToNil(event.BookingID),
		stringRef("/admin/bookings/"+event.BookingID),
		stringRef("View Booking"),
	)
	if err := c.insertIfMissing(ctx, event.EventID, ownerNotification); err != nil {
		return err
	}

	customerNotification := buildNotification(
		event.BuyerID,
		nil,
		"booking_confirmed",
		"booking",
		"high",
		"Booking Confirmed - "+event.BookingCode,
		"Your booking at "+hotel.Name+" has been confirmed. Check-in: "+event.CheckInDate+", Check-out: "+event.CheckOutDate+".",
		map[string]any{
			"eventId":        event.EventID,
			"bookingCode":    event.BookingCode,
			"bookingId":      event.BookingID,
			"hotelName":      hotel.Name,
			"checkInDate":    event.CheckInDate,
			"checkOutDate":   event.CheckOutDate,
			"numberOfGuests": event.NumberOfGuests,
			"bookedRooms":    event.BookedRooms,
		},
		stringRef("booking"),
		emptyToNil(event.BookingID),
		stringRef("/bookings/"+event.BookingID),
		stringRef("View Details"),
	)
	return c.insertIfMissing(ctx, event.EventID, customerNotification)
}

func (c *Consumer) handleRefundCreated(ctx context.Context, data []byte) error {
	event, err := DecodeRefundCreated(data)
	if err != nil {
		return err
	}

	notification := buildNotification(
		event.BuyerID,
		nil,
		"payment_refund",
		"payment",
		"high",
		"Refund Processed",
		"A refund of "+formatCurrency(event.Currency, event.RefundAmount)+" has been processed for booking "+event.BookingCode+". It may take 5-10 business days to appear in your account.",
		map[string]any{
			"eventId":      event.EventID,
			"bookingCode":  event.BookingCode,
			"hotelId":      event.HotelID,
			"refundAmount": event.RefundAmount,
			"currency":     event.Currency,
		},
		stringRef("refund"),
		nil,
		nil,
		stringRef("View Details"),
	)
	return c.insertIfMissing(ctx, event.EventID, notification)
}

func (c *Consumer) handlePayoutCompleted(ctx context.Context, data []byte) error {
	return c.handlePayoutStatus(ctx, data, PayoutCompletedSubject, "payout_completed", "Payout Completed", "Your payout of %s has been successfully transferred to your account.", "high")
}

func (c *Consumer) handlePayoutFailed(ctx context.Context, data []byte) error {
	return c.handlePayoutStatus(ctx, data, PayoutFailedSubject, "payout_failed", "Payout Failed", "Your payout of %s could not be processed. Please check your account details.", "urgent")
}

func (c *Consumer) handlePayoutStatus(ctx context.Context, data []byte, subject, notificationType, title, messageTemplate, priority string) error {
	event, err := DecodePayoutStatus(data, subject)
	if err != nil {
		return err
	}

	hotel, err := c.repo.FindHotelOwnerInfo(ctx, event.HotelID)
	if err != nil {
		return err
	}

	relatedID := event.PayoutID
	if relatedID == "" {
		relatedID = event.TransactionID
	}

	notification := buildNotification(
		hotel.OwnerID,
		nil,
		notificationType,
		"payment",
		priority,
		title,
		fmt.Sprintf(messageTemplate, formatCurrency(event.Currency, event.Amount)),
		map[string]any{
			"eventId":       event.EventID,
			"hotelId":       event.HotelID,
			"transactionId": event.TransactionID,
			"payoutId":      event.PayoutID,
			"amount":        event.Amount,
			"currency":      event.Currency,
			"status":        event.Status,
		},
		stringRef("payout"),
		emptyToNil(relatedID),
		nil,
		nil,
	)
	return c.insertIfMissing(ctx, event.EventID, notification)
}

func (c *Consumer) handleBookingExpired(ctx context.Context, data []byte) error {
	event, err := DecodeBookingExpired(data)
	if err != nil {
		return err
	}

	notification := buildNotification(
		event.BuyerID,
		nil,
		"booking_expired",
		"booking",
		"high",
		"Booking Expired - "+event.BookingCode,
		"Your booking "+event.BookingCode+" expired because payment was not completed before "+event.PaymentDueAt+". No charge was made.",
		map[string]any{
			"eventId":      event.EventID,
			"bookingId":    event.BookingID,
			"bookingCode":  event.BookingCode,
			"checkInDate":  event.CheckInDate,
			"checkOutDate": event.CheckOutDate,
			"paymentDueAt": event.PaymentDueAt,
		},
		stringRef("booking"),
		emptyToNil(event.BookingID),
		stringRef("/bookings/"+event.BookingID),
		stringRef("View Booking"),
	)
	return c.insertIfMissing(ctx, event.EventID, notification)
}

func (c *Consumer) handleEmailRequested(_ context.Context, data []byte) error {
	event, err := DecodeEmailRequested(data)
	if err != nil {
		return err
	}
	c.logger.Info("decoded email request event", "eventId", event.EventID, "type", event.Type, "email", stringValue(event.Data["email"]), "hasSubject", stringValue(event.Data["subject"]) != "")
	if c.mailer == nil || !c.mailer.Enabled() {
		c.logger.Warn("email requested event skipped because smtp is not configured", "eventId", event.EventID, "type", event.Type)
		return nil
	}

	emailAddress, _ := event.Data["email"].(string)
	subject, _ := event.Data["subject"].(string)

	return c.mailer.Send(notificationEmail.EmailRequest{
		Type:      event.Type,
		Email:     emailAddress,
		Subject:   subject,
		Variables: event.Data,
	})
}

func (c *Consumer) handleTestInAppRequested(ctx context.Context, data []byte) error {
	event, err := DecodeTestInAppRequested(data)
	if err != nil {
		c.logger.Error("failed to decode test in-app event", "payload", truncatePayload(data), "error", err)
		return err
	}
	c.logger.Info(
		"decoded test in-app event",
		"eventId", event.EventID,
		"receiverCount", len(event.ReceiverIDs),
		"title", event.Title,
		"category", firstNonEmpty(event.Category, "system"),
		"priority", normalizeNotificationPriority(event.Priority),
		"triggeredByAdminId", event.TriggeredByAdminID,
	)

	for idx, receiverID := range event.ReceiverIDs {
		if receiverID == "" {
			c.logger.Warn("skipping empty receiver in test in-app event", "eventId", event.EventID, "receiverIndex", idx)
			continue
		}

		metadata := cloneMetadata(event.Metadata)
		metadata["eventId"] = event.EventID
		if event.TriggeredByAdminID != "" {
			metadata["triggeredByAdminId"] = event.TriggeredByAdminID
		}
		metadata["isTest"] = true

		notification := buildNotification(
			receiverID,
			emptyToNil(event.SenderID),
			"system_alert",
			firstNonEmpty(event.Category, "system"),
			normalizeNotificationPriority(event.Priority),
			event.Title,
			event.Message,
			metadata,
			nil,
			nil,
			emptyToNil(event.ActionURL),
			emptyToNil(event.ActionLabel),
		)
		c.logger.Debug(
			"creating test notification for receiver",
			"eventId", event.EventID,
			"receiverId", receiverID,
			"notificationType", notification.NotificationType,
			"title", notification.Title,
		)
		if err := c.insertIfMissing(ctx, event.EventID, notification); err != nil {
			c.logger.Error(
				"failed to persist test notification",
				"eventId", event.EventID,
				"receiverId", receiverID,
				"notificationType", notification.NotificationType,
				"error", err,
			)
			return err
		}
		c.logger.Info(
			"test notification handled for receiver",
			"eventId", event.EventID,
			"receiverId", receiverID,
			"notificationType", notification.NotificationType,
		)
	}

	return nil
}

func (c *Consumer) insertIfMissing(ctx context.Context, eventID string, notification model.NotificationCreate) error {
	exists, err := c.repo.EventNotificationExists(ctx, eventID, notification.ReceiverID, notification.NotificationType)
	if err != nil {
		c.logger.Error(
			"failed to check notification idempotency",
			"eventId", eventID,
			"receiverId", notification.ReceiverID,
			"notificationType", notification.NotificationType,
			"error", err,
		)
		return err
	}
	if exists {
		c.logger.Info(
			"skipping duplicate notification",
			"eventId", eventID,
			"receiverId", notification.ReceiverID,
			"notificationType", notification.NotificationType,
		)
		return nil
	}

	createdNotification, err := c.repo.CreateNotificationRecord(ctx, notification)
	if err != nil {
		c.logger.Error(
			"failed to insert notification",
			"eventId", eventID,
			"receiverId", notification.ReceiverID,
			"notificationType", notification.NotificationType,
			"title", notification.Title,
			"error", err,
		)
		return err
	}

	if err := c.publishRealtimeDispatch(ctx, eventID, createdNotification); err != nil {
		c.logger.Warn(
			"failed to publish realtime notification dispatch",
			"eventId", eventID,
			"notificationId", createdNotification.ID,
			"receiverId", createdNotification.ReceiverID,
			"error", err,
		)
	}
	c.logger.Info(
		"notification inserted",
		"eventId", eventID,
		"notificationId", createdNotification.ID,
		"receiverId", createdNotification.ReceiverID,
		"notificationType", createdNotification.NotificationType,
		"title", createdNotification.Title,
	)
	return nil
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

func cloneMetadata(value map[string]any) map[string]any {
	if len(value) == 0 {
		return map[string]any{}
	}

	cloned := make(map[string]any, len(value))
	for key, item := range value {
		cloned[key] = item
	}
	return cloned
}

func messageLogFields(msg *nats.Msg) []any {
	meta, err := msg.Metadata()
	if err != nil {
		return []any{"metaError", err.Error()}
	}

	return []any{
		"stream", meta.Stream,
		"consumer", meta.Consumer,
		"streamSeq", meta.Sequence.Stream,
		"consumerSeq", meta.Sequence.Consumer,
		"deliveries", meta.NumDelivered,
		"pending", meta.NumPending,
	}
}

func truncatePayload(data []byte) string {
	const maxLen = 1000
	if len(data) <= maxLen {
		return string(data)
	}
	return string(data[:maxLen]) + "...(truncated)"
}

func stringValue(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case nil:
		return ""
	default:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return fmt.Sprintf("%v", typed)
		}
		return string(encoded)
	}
}

func normalizeNotificationPriority(value string) string {
	switch value {
	case "low", "normal", "high", "urgent":
		return value
	case "medium":
		return "normal"
	case "":
		return "normal"
	default:
		return "normal"
	}
}

func (c *Consumer) publishRealtimeDispatch(ctx context.Context, eventID string, notification model.Notification) error {
	targets, err := c.repo.FindSocketDispatchTargets(ctx, notification.ReceiverID)
	if err != nil {
		return err
	}
	if len(targets) == 0 {
		c.logger.Info(
			"no realtime dispatch targets resolved for notification",
			"eventId", eventID,
			"notificationId", notification.ID,
			"receiverId", notification.ReceiverID,
		)
		return nil
	}

	unreadCount, err := c.repo.CountUnread(ctx, notification.ReceiverID)
	if err != nil {
		return err
	}

	payload := RealtimeDispatch{
		EventID:      eventID,
		OccurredAt:   time.Now().UTC(),
		Notification: notification,
		Targets:      targets,
		UnreadCount:  unreadCount,
		ReceiverID:   notification.ReceiverID,
	}

	envelope := map[string]any{
		"eventId":        eventID + "-realtime-dispatch-" + notification.ID,
		"eventType":      RealtimeDispatchSubject,
		"version":        1,
		"occurredAt":     time.Now().UTC().Format(time.RFC3339Nano),
		"producer":       "travelnest-notification-service",
		"correlationId":  eventID,
		"idempotencyKey": notification.ID,
		"payload":        payload,
	}

	encoded, err := json.Marshal(envelope)
	if err != nil {
		return err
	}

	if _, err := c.js.Publish(RealtimeDispatchSubject, encoded, nats.MsgId(notification.ID)); err != nil {
		return err
	}

	c.logger.Info(
		"published realtime notification dispatch",
		"eventId", eventID,
		"notificationId", notification.ID,
		"receiverId", notification.ReceiverID,
		"targetCount", len(targets),
		"unreadCount", unreadCount,
	)
	return nil
}

package events

import (
	"fmt"
	"strconv"

	"github.com/travelnest/services/notification/internal/model"
)

func buildNotification(
	receiverID string,
	senderID *string,
	notificationType string,
	category string,
	priority string,
	title string,
	message string,
	metadata map[string]any,
	relatedEntityType *string,
	relatedEntityID *string,
	actionURL *string,
	actionLabel *string,
) model.NotificationCreate {
	return model.NotificationCreate{
		ReceiverID:        receiverID,
		SenderID:          senderID,
		NotificationType:  notificationType,
		Category:          category,
		Priority:          priority,
		Title:             title,
		Message:           message,
		Metadata:          metadata,
		RelatedEntityType: relatedEntityType,
		RelatedEntityID:   relatedEntityID,
		ActionURL:         actionURL,
		ActionLabel:       actionLabel,
	}
}

func stringRef(value string) *string {
	return &value
}

func emptyToNil(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func firstNonEmpty(value, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}

func itoa(value int) string {
	return strconv.Itoa(value)
}

func formatCurrency(currency string, amount int64) string {
	if currency == "" {
		currency = "USD"
	}
	if currency == "usd" || currency == "USD" {
		return "USD " + fmt.Sprintf("%.2f", float64(amount)/100)
	}
	return currency + " " + strconv.FormatInt(amount, 10)
}

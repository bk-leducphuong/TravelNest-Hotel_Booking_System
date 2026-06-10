package model

import "time"

type Sender struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
}

type Notification struct {
	ID                string         `json:"id"`
	ReceiverID        string         `json:"receiver_id"`
	SenderID          *string        `json:"sender_id,omitempty"`
	NotificationType  string         `json:"notification_type"`
	Category          string         `json:"category"`
	Priority          string         `json:"priority"`
	Title             string         `json:"title"`
	Message           string         `json:"message"`
	Metadata          map[string]any `json:"metadata,omitempty"`
	RelatedEntityType *string        `json:"related_entity_type,omitempty"`
	RelatedEntityID   *string        `json:"related_entity_id,omitempty"`
	ActionURL         *string        `json:"action_url,omitempty"`
	ActionLabel       *string        `json:"action_label,omitempty"`
	IsRead            bool           `json:"is_read"`
	ReadAt            *time.Time     `json:"read_at,omitempty"`
	ExpiresAt         *time.Time     `json:"expires_at,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	Sender            *Sender        `json:"sender,omitempty"`
}

type NotificationCreate struct {
	ReceiverID        string
	SenderID          *string
	NotificationType  string
	Category          string
	Priority          string
	Title             string
	Message           string
	Metadata          map[string]any
	RelatedEntityType *string
	RelatedEntityID   *string
	ActionURL         *string
	ActionLabel       *string
	ExpiresAt         *time.Time
}

type SocketDispatchTarget struct {
	Namespace string `json:"namespace"`
	Room      string `json:"room"`
	Event     string `json:"event"`
}

type ListQuery struct {
	Limit      int
	Offset     int
	UnreadOnly bool
	Category   string
	Type       string
	Priority   string
}

type ListResult struct {
	Notifications []Notification `json:"notifications"`
	Page          int            `json:"page"`
	Limit         int            `json:"limit"`
	Total         int            `json:"total"`
}

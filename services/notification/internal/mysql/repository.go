package mysql

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/travelnest/services/notification/internal/model"
)

var ErrNotFound = errors.New("not found")

type Repository struct {
	db *sql.DB
}

func Connect(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(15)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListNotifications(ctx context.Context, userID string, query model.ListQuery) (model.ListResult, error) {
	where, args := buildListWhere(userID, query)

	var total int
	countSQL := `SELECT COUNT(*) FROM notifications n ` + where
	if err := r.db.QueryRowContext(ctx, countSQL, args...).Scan(&total); err != nil {
		return model.ListResult{}, err
	}

	listArgs := append(append([]any{}, args...), query.Limit, query.Offset)
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			n.id,
			n.receiver_id,
			n.sender_id,
			n.notification_type,
			n.category,
			n.priority,
			n.title,
			n.message,
			n.metadata,
			n.related_entity_type,
			n.related_entity_id,
			n.action_url,
			n.action_label,
			n.is_read,
			n.read_at,
			n.expires_at,
			n.created_at,
			n.updated_at,
			s.id,
			s.first_name,
			s.last_name,
			s.email
		FROM notifications n
		LEFT JOIN users s ON s.id = n.sender_id
		`+where+`
		ORDER BY n.priority DESC, n.created_at DESC
		LIMIT ? OFFSET ?
	`, listArgs...)
	if err != nil {
		return model.ListResult{}, err
	}
	defer rows.Close()

	notifications := make([]model.Notification, 0, query.Limit)
	for rows.Next() {
		notification, err := scanNotification(rows)
		if err != nil {
			return model.ListResult{}, err
		}
		notifications = append(notifications, notification)
	}
	if err := rows.Err(); err != nil {
		return model.ListResult{}, err
	}

	page := 1
	if query.Limit > 0 {
		page = (query.Offset / query.Limit) + 1
	}

	return model.ListResult{
		Notifications: notifications,
		Page:          page,
		Limit:         query.Limit,
		Total:         total,
	}, nil
}

func (r *Repository) FindNotificationOwner(ctx context.Context, notificationID string) (string, error) {
	var receiverID string
	err := r.db.QueryRowContext(ctx, `
		SELECT receiver_id
		FROM notifications
		WHERE id = ? AND deleted_at IS NULL
	`, notificationID).Scan(&receiverID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return receiverID, err
}

func (r *Repository) MarkAsRead(ctx context.Context, notificationID string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE notifications
		SET is_read = TRUE,
			read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND deleted_at IS NULL
	`, notificationID)
	if err != nil {
		return err
	}
	return requireAffected(result)
}

func (r *Repository) MarkAllAsRead(ctx context.Context, userID string) (int64, error) {
	result, err := r.db.ExecContext(ctx, `
		UPDATE notifications
		SET is_read = TRUE,
			read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
			updated_at = CURRENT_TIMESTAMP
		WHERE receiver_id = ? AND is_read = FALSE AND deleted_at IS NULL
	`, userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func (r *Repository) CountUnread(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM notifications
		WHERE receiver_id = ? AND is_read = FALSE AND deleted_at IS NULL
	`, userID).Scan(&count)
	return count, err
}

func (r *Repository) EventNotificationExists(ctx context.Context, eventID, receiverID, notificationType string) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, `
		SELECT 1
		FROM notifications
		WHERE receiver_id = ?
		  AND notification_type = ?
		  AND deleted_at IS NULL
		  AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.eventId')) = ?
		LIMIT 1
	`, receiverID, notificationType, eventID).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (r *Repository) CreateNotification(ctx context.Context, input model.NotificationCreate) error {
	_, err := r.CreateNotificationRecord(ctx, input)
	return err
}

func (r *Repository) CreateNotificationRecord(ctx context.Context, input model.NotificationCreate) (model.Notification, error) {
	metadata, err := json.Marshal(input.Metadata)
	if err != nil {
		return model.Notification{}, err
	}

	var notificationID string
	if err := r.db.QueryRowContext(ctx, `SELECT UUID()`).Scan(&notificationID); err != nil {
		return model.Notification{}, err
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO notifications (
			id,
			receiver_id,
			sender_id,
			notification_type,
			category,
			priority,
			title,
			message,
			metadata,
			related_entity_type,
			related_entity_id,
			action_url,
			action_label,
			expires_at,
			created_at,
			updated_at
		)
		VALUES (
			?,
			?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
			CURRENT_TIMESTAMP,
			CURRENT_TIMESTAMP
		)
	`, notificationID, input.ReceiverID, input.SenderID, input.NotificationType, input.Category, input.Priority,
		input.Title, input.Message, metadata, input.RelatedEntityType, input.RelatedEntityID,
		input.ActionURL, input.ActionLabel, input.ExpiresAt)
	if err != nil {
		return model.Notification{}, err
	}

	return r.GetNotificationByID(ctx, notificationID)
}

type HotelOwnerInfo struct {
	HotelID string
	Name    string
	OwnerID string
}

func (r *Repository) FindHotelOwnerInfo(ctx context.Context, hotelID string) (*HotelOwnerInfo, error) {
	var (
		row     HotelOwnerInfo
		ownerID sql.NullString
	)
	err := r.db.QueryRowContext(ctx, `
		SELECT
			h.id,
			h.name,
			(
				SELECT hu.user_id
				FROM hotel_users hu
				WHERE hu.hotel_id = h.id
				ORDER BY hu.is_primary_owner DESC, hu.created_at ASC
				LIMIT 1
			) AS owner_id
		FROM hotels h
		WHERE h.id = ?
	`, hotelID).Scan(&row.HotelID, &row.Name, &ownerID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if !ownerID.Valid || ownerID.String == "" {
		return nil, ErrNotFound
	}
	row.OwnerID = ownerID.String
	return &row, nil
}

func (r *Repository) GetNotificationByID(ctx context.Context, notificationID string) (model.Notification, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT
			n.id,
			n.receiver_id,
			n.sender_id,
			n.notification_type,
			n.category,
			n.priority,
			n.title,
			n.message,
			n.metadata,
			n.related_entity_type,
			n.related_entity_id,
			n.action_url,
			n.action_label,
			n.is_read,
			n.read_at,
			n.expires_at,
			n.created_at,
			n.updated_at,
			s.id,
			s.first_name,
			s.last_name,
			s.email
		FROM notifications n
		LEFT JOIN users s ON s.id = n.sender_id
		WHERE n.id = ? AND n.deleted_at IS NULL
	`, notificationID)

	notification, err := scanNotification(row)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Notification{}, ErrNotFound
	}
	return notification, err
}

func (r *Repository) FindSocketDispatchTargets(ctx context.Context, userID string) ([]model.SocketDispatchTarget, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT ro.name
		FROM user_roles ur
		INNER JOIN roles ro ON ro.id = ur.role_id
		WHERE ur.user_id = ?
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	roleSet := map[string]struct{}{}
	for rows.Next() {
		var roleName string
		if err := rows.Scan(&roleName); err != nil {
			return nil, err
		}
		roleSet[roleName] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	targets := make([]model.SocketDispatchTarget, 0, 3)
	if len(roleSet) == 0 {
		targets = append(targets, model.SocketDispatchTarget{
			Namespace: "/user",
			Room:      "user_" + userID,
			Event:     "notification:new",
		})
		return targets, nil
	}

	if hasAnyRole(roleSet, "user", "admin") {
		targets = append(targets, model.SocketDispatchTarget{
			Namespace: "/user",
			Room:      "user_" + userID,
			Event:     "notification:new",
		})
	}
	if hasAnyRole(roleSet, "owner", "manager", "staff", "admin") {
		targets = append(targets, model.SocketDispatchTarget{
			Namespace: "/property",
			Room:      "property_user_" + userID,
			Event:     "notification:new",
		})
	}
	if hasAnyRole(roleSet, "admin") {
		targets = append(targets, model.SocketDispatchTarget{
			Namespace: "/admin",
			Room:      "admin_" + userID,
			Event:     "notification:new",
		})
	}

	return targets, nil
}

func hasAnyRole(roleSet map[string]struct{}, roles ...string) bool {
	for _, role := range roles {
		if _, ok := roleSet[role]; ok {
			return true
		}
	}
	return false
}

func buildListWhere(userID string, query model.ListQuery) (string, []any) {
	clauses := []string{
		"n.receiver_id = ?",
		"n.deleted_at IS NULL",
		"(n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)",
	}
	args := []any{userID}

	if query.UnreadOnly {
		clauses = append(clauses, "n.is_read = FALSE")
	}
	if query.Category != "" {
		clauses = append(clauses, "n.category = ?")
		args = append(args, query.Category)
	}
	if query.Type != "" {
		clauses = append(clauses, "n.notification_type = ?")
		args = append(args, query.Type)
	}
	if query.Priority != "" {
		clauses = append(clauses, "n.priority = ?")
		args = append(args, query.Priority)
	}

	return "WHERE " + strings.Join(clauses, " AND "), args
}

type scanner interface {
	Scan(dest ...any) error
}

func scanNotification(row scanner) (model.Notification, error) {
	var notification model.Notification
	var senderID sql.NullString
	var metadataBytes []byte
	var relatedEntityType sql.NullString
	var relatedEntityID sql.NullString
	var actionURL sql.NullString
	var actionLabel sql.NullString
	var readAt sql.NullTime
	var expiresAt sql.NullTime
	var sender model.Sender
	var senderRowID sql.NullString
	var senderFirstName sql.NullString
	var senderLastName sql.NullString
	var senderEmail sql.NullString

	err := row.Scan(
		&notification.ID,
		&notification.ReceiverID,
		&senderID,
		&notification.NotificationType,
		&notification.Category,
		&notification.Priority,
		&notification.Title,
		&notification.Message,
		&metadataBytes,
		&relatedEntityType,
		&relatedEntityID,
		&actionURL,
		&actionLabel,
		&notification.IsRead,
		&readAt,
		&expiresAt,
		&notification.CreatedAt,
		&notification.UpdatedAt,
		&senderRowID,
		&senderFirstName,
		&senderLastName,
		&senderEmail,
	)
	if err != nil {
		return model.Notification{}, err
	}

	notification.SenderID = stringPtr(senderID)
	notification.RelatedEntityType = stringPtr(relatedEntityType)
	notification.RelatedEntityID = stringPtr(relatedEntityID)
	notification.ActionURL = stringPtr(actionURL)
	notification.ActionLabel = stringPtr(actionLabel)
	notification.ReadAt = timePtr(readAt)
	notification.ExpiresAt = timePtr(expiresAt)
	notification.Metadata = decodeMetadata(metadataBytes)

	if senderRowID.Valid {
		sender.ID = senderRowID.String
		sender.FirstName = senderFirstName.String
		sender.LastName = senderLastName.String
		sender.Email = senderEmail.String
		notification.Sender = &sender
	}

	return notification, nil
}

func decodeMetadata(value []byte) map[string]any {
	if len(value) == 0 {
		return nil
	}
	var metadata map[string]any
	if err := json.Unmarshal(value, &metadata); err != nil {
		return map[string]any{"raw": string(value)}
	}
	return metadata
}

func stringPtr(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}
	result := value.String
	return &result
}

func timePtr(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	result := value.Time
	return &result
}

func requireAffected(result sql.Result) error {
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

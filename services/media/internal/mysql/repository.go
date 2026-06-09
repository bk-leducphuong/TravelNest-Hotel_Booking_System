package mysql

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/travelnest/services/media/internal/model"
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

func (r *Repository) CreateImage(ctx context.Context, image model.Image) error {
	isPrimary := sql.NullBool{}
	if image.IsPrimary {
		isPrimary = sql.NullBool{Bool: true, Valid: true}
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO images (
			id, entity_type, entity_id, bucket_name, object_key, original_filename,
			file_size, mime_type, is_primary, status, uploaded_at, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, image.ID, image.EntityType, image.EntityID, image.BucketName, image.ObjectKey,
		image.OriginalFilename, image.FileSize, image.MimeType, isPrimary, image.Status)
	return err
}

func (r *Repository) FindImagesByEntity(ctx context.Context, entityType, entityID, status string) ([]model.Image, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, entity_type, entity_id, bucket_name, object_key, original_filename,
			file_size, mime_type, width, height, COALESCE(display_order, 0), is_primary,
			status, uploaded_at, deleted_at
		FROM images
		WHERE entity_type = ? AND entity_id = ? AND status = ?
		ORDER BY is_primary DESC, display_order ASC, uploaded_at DESC
	`, entityType, entityID, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var images []model.Image
	for rows.Next() {
		image, err := scanImage(rows)
		if err != nil {
			return nil, err
		}
		images = append(images, image)
	}
	return images, rows.Err()
}

func (r *Repository) FindImageByID(ctx context.Context, imageID string) (model.Image, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, entity_type, entity_id, bucket_name, object_key, original_filename,
			file_size, mime_type, width, height, COALESCE(display_order, 0), is_primary,
			status, uploaded_at, deleted_at
		FROM images
		WHERE id = ?
	`, imageID)
	image, err := scanImage(row)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Image{}, ErrNotFound
	}
	return image, err
}

func (r *Repository) SoftDeleteImage(ctx context.Context, imageID string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE images SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, imageID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) SetPrimaryImage(ctx context.Context, entityType, entityID, imageID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		UPDATE images
		SET is_primary = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE entity_type = ? AND entity_id = ? AND status = 'active'
	`, entityType, entityID)
	if err != nil {
		return err
	}
	_, _ = result.RowsAffected()

	result, err = tx.ExecContext(ctx, `
		UPDATE images
		SET is_primary = TRUE, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND entity_type = ? AND entity_id = ? AND status = 'active'
	`, imageID, entityType, entityID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return tx.Commit()
}

func (r *Repository) FindVariantsByImageID(ctx context.Context, imageID string) ([]model.ImageVariant, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, image_id, variant_type, bucket_name, object_key, file_size, width, height, created_at
		FROM image_variants
		WHERE image_id = ?
	`, imageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var variants []model.ImageVariant
	for rows.Next() {
		var variant model.ImageVariant
		var width, height sql.NullInt64
		if err := rows.Scan(
			&variant.ID,
			&variant.ImageID,
			&variant.VariantType,
			&variant.BucketName,
			&variant.ObjectKey,
			&variant.FileSize,
			&width,
			&height,
			&variant.CreatedAt,
		); err != nil {
			return nil, err
		}
		variant.Width = intPtr(width)
		variant.Height = intPtr(height)
		variants = append(variants, variant)
	}
	return variants, rows.Err()
}

func (r *Repository) CreateVariantIfMissing(ctx context.Context, variant model.ImageVariant) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO image_variants (
			id, image_id, variant_type, bucket_name, object_key, file_size, width, height, created_at
		)
		SELECT ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
		WHERE NOT EXISTS (
			SELECT 1 FROM image_variants WHERE image_id = ? AND variant_type = ?
		)
	`, variant.ID, variant.ImageID, variant.VariantType, variant.BucketName, variant.ObjectKey,
		variant.FileSize, nullableInt(variant.Width), nullableInt(variant.Height), variant.ImageID, variant.VariantType)
	return err
}

func (r *Repository) MarkImageProcessed(ctx context.Context, imageID string, width, height *int) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE images
		SET width = ?, height = ?, status = 'active', has_thumbnail = TRUE,
			has_compressed = TRUE, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, nullableInt(width), nullableInt(height), imageID)
	return err
}

func (r *Repository) UpdateUserAvatar(ctx context.Context, userID, profilePictureURL string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE users SET profile_picture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
	`, profilePictureURL, userID)
	if err != nil {
		return err
	}
	return requireAffected(result, "user")
}

func (r *Repository) RoomBelongsToHotel(ctx context.Context, roomID, hotelID string) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx, `
		SELECT 1 FROM rooms WHERE id = ? AND hotel_id = ? LIMIT 1
	`, roomID, hotelID).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (r *Repository) UpdateRoomImages(ctx context.Context, roomID, imageURLsJSON string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE rooms SET image_urls = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
	`, imageURLsJSON, roomID)
	if err != nil {
		return err
	}
	return requireAffected(result, "room")
}

type scanner interface {
	Scan(dest ...any) error
}

func scanImage(row scanner) (model.Image, error) {
	var image model.Image
	var width, height sql.NullInt64
	var isPrimary sql.NullBool
	var deletedAt sql.NullTime
	err := row.Scan(
		&image.ID,
		&image.EntityType,
		&image.EntityID,
		&image.BucketName,
		&image.ObjectKey,
		&image.OriginalFilename,
		&image.FileSize,
		&image.MimeType,
		&width,
		&height,
		&image.DisplayOrder,
		&isPrimary,
		&image.Status,
		&image.UploadedAt,
		&deletedAt,
	)
	if err != nil {
		return model.Image{}, err
	}
	image.Width = intPtr(width)
	image.Height = intPtr(height)
	image.IsPrimary = isPrimary.Valid && isPrimary.Bool
	if deletedAt.Valid {
		image.DeletedAt = &deletedAt.Time
	}
	return image, nil
}

func intPtr(value sql.NullInt64) *int {
	if !value.Valid {
		return nil
	}
	parsed := int(value.Int64)
	return &parsed
}

func nullableInt(value *int) sql.NullInt64 {
	if value == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: int64(*value), Valid: true}
}

func requireAffected(result sql.Result, label string) error {
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("%w: %s", ErrNotFound, label)
	}
	return nil
}

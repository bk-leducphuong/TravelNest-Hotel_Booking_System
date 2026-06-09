package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/travelnest/services/media/internal/events"
	"github.com/travelnest/services/media/internal/imageproc"
	"github.com/travelnest/services/media/internal/model"
	mediaMySQL "github.com/travelnest/services/media/internal/mysql"
	"github.com/travelnest/services/media/internal/storage"
)

type Server struct {
	repo           *mediaMySQL.Repository
	storage        *storage.Client
	publisher      *events.Publisher
	maxUploadBytes int64
	logger         *slog.Logger
}

func NewServer(repo *mediaMySQL.Repository, storageClient *storage.Client, publisher *events.Publisher, maxUploadBytes int64, logger *slog.Logger) http.Handler {
	if logger == nil {
		logger = slog.Default()
	}
	server := &Server{
		repo:           repo,
		storage:        storageClient,
		publisher:      publisher,
		maxUploadBytes: maxUploadBytes,
		logger:         logger,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", server.healthz)
	mux.HandleFunc("/media/images/", server.images)
	mux.HandleFunc("PATCH /media/users/", server.userAvatar)
	mux.HandleFunc("POST /media/join/photos", server.joinPhotos)
	return server.logRequests(mux)
}

func (s *Server) healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) images(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/media/images/"), "/")
	parts := strings.Split(path, "/")
	switch {
	case r.Method == http.MethodPost && len(parts) == 2:
		s.uploadImage(w, r, parts[0], parts[1])
	case r.Method == http.MethodGet && len(parts) == 2:
		s.getImages(w, r, parts[0], parts[1])
	case r.Method == http.MethodPut && len(parts) == 4 && parts[2] == "primary":
		s.setPrimaryImage(w, r, parts[0], parts[1], parts[3])
	case r.Method == http.MethodDelete && len(parts) == 1:
		s.deleteImage(w, r, parts[0])
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) uploadImage(w http.ResponseWriter, r *http.Request, entityType, entityID string) {
	if !validEntityType(entityType) {
		writeError(w, http.StatusBadRequest, "INVALID_ENTITY_TYPE", "Invalid entity type")
		return
	}
	file, header, err := s.multipartFile(r, "file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "NO_FILE_PROVIDED", "No file provided")
		return
	}
	defer file.Close()
	body, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_FILE", "Failed to read uploaded file")
		return
	}
	imageID, err := uuid.NewV7()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "UUID_FAILED", "Failed to generate image id")
		return
	}
	extension := strings.TrimPrefix(filepath.Ext(header.Filename), ".")
	if extension == "" {
		extension = "jpg"
	}
	objectKey := fmt.Sprintf("%s/%s/%s.%s", entityType, entityID, imageID.String(), extension)
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	size, err := s.storage.Upload(r.Context(), objectKey, body, contentType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "UPLOAD_FAILED", "Failed to upload image")
		return
	}
	isPrimary := parseBool(firstValue(r.MultipartForm.Value["is_primary"]))
	status := "processing"
	image := model.Image{
		ID:               imageID.String(),
		EntityType:       entityType,
		EntityID:         entityID,
		BucketName:       s.storage.Bucket(),
		ObjectKey:        objectKey,
		OriginalFilename: header.Filename,
		FileSize:         size,
		MimeType:         contentType,
		IsPrimary:        isPrimary,
		Status:           status,
	}
	if err := s.repo.CreateImage(r.Context(), image); err != nil {
		writeError(w, http.StatusInternalServerError, "METADATA_CREATE_FAILED", "Failed to save image metadata")
		return
	}
	if isPrimary {
		if err := s.repo.SetPrimaryImage(r.Context(), entityType, entityID, imageID.String()); err != nil {
			s.logger.Warn("failed to set uploaded image as primary", "imageId", imageID.String(), "error", err)
		}
	}
	if s.publisher != nil {
		_, err = s.publisher.PublishImageUploaded(r.Context(), events.ImageUploadedPayload{
			ImageID:    imageID.String(),
			EntityType: entityType,
			EntityID:   entityID,
			Bucket:     s.storage.Bucket(),
			ObjectKey:  objectKey,
			MimeType:   contentType,
			IsPrimary:  isPrimary,
		})
		if err != nil {
			s.logger.Warn("failed to publish image processing event", "imageId", imageID.String(), "error", err)
		}
	}
	writeJSON(w, http.StatusCreated, model.UploadImageResult{
		ID:               imageID.String(),
		EntityType:       entityType,
		EntityID:         entityID,
		OriginalFilename: header.Filename,
		FileSize:         size,
		MimeType:         contentType,
		IsPrimary:        isPrimary,
		Status:           status,
		Message:          "Image uploaded and queued for processing",
	})
}

func (s *Server) getImages(w http.ResponseWriter, r *http.Request, entityType, entityID string) {
	rows, err := s.repo.FindImagesByEntity(r.Context(), entityType, entityID, "active")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "GET_IMAGES_FAILED", "Failed to get images")
		return
	}
	responses := make([]model.ImageResponse, 0, len(rows))
	for _, image := range rows {
		variants, err := s.repo.FindVariantsByImageID(r.Context(), image.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "GET_IMAGES_FAILED", "Failed to get image variants")
			return
		}
		responses = append(responses, imageResponse(image, variants))
	}
	writeJSON(w, http.StatusOK, responses)
}

func (s *Server) deleteImage(w http.ResponseWriter, r *http.Request, imageID string) {
	image, err := s.repo.FindImageByID(r.Context(), imageID)
	if errors.Is(err, mediaMySQL.ErrNotFound) {
		writeError(w, http.StatusNotFound, "IMAGE_NOT_FOUND", "Image not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DELETE_IMAGE_FAILED", "Failed to delete image")
		return
	}
	if image.Status == "deleted" {
		writeError(w, http.StatusBadRequest, "IMAGE_ALREADY_DELETED", "Image already deleted")
		return
	}
	if err := s.repo.SoftDeleteImage(r.Context(), imageID); err != nil {
		writeError(w, http.StatusInternalServerError, "DELETE_IMAGE_FAILED", "Failed to delete image")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"id": imageID, "message": "Image deleted successfully"})
}

func (s *Server) setPrimaryImage(w http.ResponseWriter, r *http.Request, entityType, entityID, imageID string) {
	image, err := s.repo.FindImageByID(r.Context(), imageID)
	if errors.Is(err, mediaMySQL.ErrNotFound) {
		writeError(w, http.StatusNotFound, "IMAGE_NOT_FOUND", "Image not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "SET_PRIMARY_FAILED", "Failed to set primary image")
		return
	}
	if image.EntityType != entityType || image.EntityID != entityID {
		writeError(w, http.StatusForbidden, "IMAGE_NOT_BELONGS_TO_ENTITY", "Image does not belong to this entity")
		return
	}
	if image.Status != "active" {
		writeError(w, http.StatusBadRequest, "INVALID_IMAGE_STATUS", "Cannot set non-active image as primary")
		return
	}
	if err := s.repo.SetPrimaryImage(r.Context(), entityType, entityID, imageID); err != nil {
		writeError(w, http.StatusInternalServerError, "SET_PRIMARY_FAILED", "Failed to set primary image")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"id": imageID, "message": "Primary image set successfully"})
}

func (s *Server) userAvatar(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/media/users/"), "/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 || parts[1] != "avatar" {
		http.NotFound(w, r)
		return
	}
	userID := parts[0]
	file, header, err := s.multipartFile(r, "avatar")
	if err != nil {
		s.logger.Warn(
			"user avatar upload rejected",
			"userId", userID,
			"path", r.URL.Path,
			"contentType", r.Header.Get("Content-Type"),
			"contentLength", r.ContentLength,
			"error", err,
		)
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "No file uploaded")
		return
	}
	defer file.Close()
	body, err := io.ReadAll(file)
	if err != nil {
		s.logger.Error(
			"failed to read uploaded avatar file",
			"userId", userID,
			"filename", header.Filename,
			"declaredSize", header.Size,
			"contentType", header.Header.Get("Content-Type"),
			"error", err,
		)
		writeError(w, http.StatusBadRequest, "INVALID_FILE", "Failed to read uploaded file")
		return
	}
	avifBody := imageproc.AVIFPlaceholder(body)
	objectKey := fmt.Sprintf("users/avatars/%s.avif", userID)
	if _, err := s.storage.Upload(r.Context(), objectKey, avifBody, "image/avif"); err != nil {
		s.logger.Error(
			"failed to upload avatar to storage",
			"userId", userID,
			"filename", header.Filename,
			"sourceBytes", len(body),
			"avifBytes", len(avifBody),
			"objectKey", objectKey,
			"bucket", s.storage.Bucket(),
			"error", err,
		)
		writeError(w, http.StatusInternalServerError, "UPLOAD_FAILED", "Failed to upload image to storage")
		return
	}
	profilePictureURL := s.storage.PublicURL(objectKey)
	if err := s.repo.UpdateUserAvatar(r.Context(), userID, profilePictureURL); err != nil {
		s.logger.Error(
			"failed to persist user avatar url",
			"userId", userID,
			"filename", header.Filename,
			"profilePictureURL", profilePictureURL,
			"objectKey", objectKey,
			"error", err,
		)
		writeError(w, http.StatusInternalServerError, "UPLOAD_FAILED", "Failed to update user avatar")
		return
	}
	s.logger.Info(
		"user avatar updated",
		"userId", userID,
		"filename", header.Filename,
		"sourceBytes", len(body),
		"avifBytes", len(avifBody),
		"profilePictureURL", profilePictureURL,
	)
	writeJSON(w, http.StatusOK, map[string]string{
		"profilePictureUrl": profilePictureURL,
		"message":           "Avatar updated successfully",
	})
}

func (s *Server) joinPhotos(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(s.maxUploadBytes * 30); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid multipart request")
		return
	}
	hotelID := r.FormValue("hotel_id")
	roomID := r.FormValue("room_id")
	if hotelID == "" || roomID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_PARAMETERS", "hotel_id and room_id are required")
		return
	}
	ok, err := s.repo.RoomBelongsToHotel(r.Context(), roomID, hotelID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ROOM_LOOKUP_FAILED", "Failed to validate room")
		return
	}
	if !ok {
		writeError(w, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found or does not belong to the specified hotel")
		return
	}
	files := r.MultipartForm.File["images"]
	if len(files) == 0 {
		writeError(w, http.StatusBadRequest, "NO_FILES_UPLOADED", "No files uploaded")
		return
	}
	if len(files) > 30 {
		writeError(w, http.StatusBadRequest, "TOO_MANY_FILES", "Too many files uploaded")
		return
	}
	imageURLs := make([]string, 0, len(files))
	for index, header := range files {
		file, err := header.Open()
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_FILE", "Failed to read uploaded file")
			return
		}
		body, err := io.ReadAll(file)
		_ = file.Close()
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_FILE", "Failed to read uploaded file")
			return
		}
		objectKey := fmt.Sprintf("hotels/%s/rooms/%s/%d_%d.avif", hotelID, roomID, time.Now().UnixMilli(), index)
		if _, err := s.storage.Upload(r.Context(), objectKey, imageproc.AVIFPlaceholder(body), "image/avif"); err != nil {
			writeError(w, http.StatusInternalServerError, "IMAGE_PROCESSING_FAILED", "Failed to process image")
			return
		}
		imageURLs = append(imageURLs, s.storage.PublicURL(objectKey))
	}
	body, err := json.Marshal(imageURLs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "IMAGE_URLS_FAILED", "Failed to encode image URLs")
		return
	}
	if err := s.repo.UpdateRoomImages(r.Context(), roomID, string(body)); err != nil {
		writeError(w, http.StatusInternalServerError, "IMAGE_URLS_FAILED", "Failed to update room images")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"message":   "Photos uploaded and processed successfully",
		"imageUrls": imageURLs,
		"count":     len(imageURLs),
	})
}

func (s *Server) multipartFile(r *http.Request, field string) (multipart.File, *multipart.FileHeader, error) {
	if err := r.ParseMultipartForm(s.maxUploadBytes); err != nil {
		return nil, nil, err
	}
	file, header, err := r.FormFile(field)
	if err != nil {
		return nil, nil, err
	}
	if header.Size > s.maxUploadBytes {
		_ = file.Close()
		return nil, nil, fmt.Errorf("file too large")
	}
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		_ = file.Close()
		return nil, nil, fmt.Errorf("not an image")
	}
	return file, header, nil
}

func imageResponse(image model.Image, variants []model.ImageVariant) model.ImageResponse {
	variantMap := make(map[string]model.ImageVariantResponse, len(variants))
	for _, variant := range variants {
		variantMap[variant.VariantType] = model.ImageVariantResponse{
			URL:      variant.ObjectKey,
			Width:    variant.Width,
			Height:   variant.Height,
			FileSize: variant.FileSize,
		}
	}
	return model.ImageResponse{
		ID:               image.ID,
		OriginalFilename: image.OriginalFilename,
		FileSize:         image.FileSize,
		MimeType:         image.MimeType,
		Width:            image.Width,
		Height:           image.Height,
		IsPrimary:        image.IsPrimary,
		DisplayOrder:     image.DisplayOrder,
		Status:           image.Status,
		UploadedAt:       image.UploadedAt,
		URL:              image.ObjectKey,
		Variants:         variantMap,
	}
}

func validEntityType(entityType string) bool {
	switch entityType {
	case "hotel", "room", "review", "user_avatar", "city", "country":
		return true
	default:
		return false
	}
}

func parseBool(value string) bool {
	return value == "true" || value == "1"
}

func firstValue(values []string) string {
	if len(values) == 0 {
		return ""
	}
	return values[0]
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &responseRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		s.logger.Info(
			"http request completed",
			"method", r.Method,
			"path", r.URL.Path,
			"status", recorder.status,
			"bytes", recorder.bytes,
			"durationMs", time.Since(start).Milliseconds(),
		)
	})
}

type responseRecorder struct {
	http.ResponseWriter
	status      int
	bytes       int
	wroteHeader bool
}

func (r *responseRecorder) WriteHeader(status int) {
	if r.wroteHeader {
		return
	}
	r.wroteHeader = true
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *responseRecorder) Write(body []byte) (int, error) {
	written, err := r.ResponseWriter.Write(body)
	r.bytes += written
	return written, err
}

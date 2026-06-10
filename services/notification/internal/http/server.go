package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	notificationModel "github.com/travelnest/services/notification/internal/model"
	notificationMySQL "github.com/travelnest/services/notification/internal/mysql"
)

type Server struct {
	repo                 *notificationMySQL.Repository
	internalServiceToken string
	logger               *slog.Logger
}

func NewServer(repo *notificationMySQL.Repository, internalServiceToken string, logger *slog.Logger) http.Handler {
	if logger == nil {
		logger = slog.Default()
	}
	server := &Server{
		repo:                 repo,
		internalServiceToken: internalServiceToken,
		logger:               logger,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", server.healthz)
	mux.HandleFunc("GET /notifications", server.withInternalAuth(server.listNotifications))
	mux.HandleFunc("GET /notifications/unread-count", server.withInternalAuth(server.unreadCount))
	mux.HandleFunc("PATCH /notifications/read-all", server.withInternalAuth(server.markAllRead))
	mux.HandleFunc("PATCH /notifications/", server.withInternalAuth(server.markRead))

	return server.logRequests(mux)
}

func (s *Server) healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) listNotifications(w http.ResponseWriter, r *http.Request) {
	userID := strings.TrimSpace(r.Header.Get("X-User-Id"))
	query := notificationModel.ListQuery{
		Limit:      queryInt(r, "limit", 20, 1, 100),
		UnreadOnly: queryBool(r, "unreadOnly", false),
		Category:   strings.TrimSpace(r.URL.Query().Get("category")),
		Type:       strings.TrimSpace(r.URL.Query().Get("type")),
		Priority:   strings.TrimSpace(r.URL.Query().Get("priority")),
	}
	page := queryInt(r, "page", 1, 1, 100000)
	query.Offset = (page - 1) * query.Limit

	result, err := s.repo.ListNotifications(r.Context(), userID, query)
	if err != nil {
		s.logger.Error("failed to fetch notifications", "userId", userID, "error", err)
		writeError(w, http.StatusInternalServerError, "NOTIFICATIONS_FETCH_FAILED", "Failed to fetch notifications")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) unreadCount(w http.ResponseWriter, r *http.Request) {
	userID := strings.TrimSpace(r.Header.Get("X-User-Id"))
	count, err := s.repo.CountUnread(r.Context(), userID)
	if err != nil {
		s.logger.Error("failed to count unread notifications", "userId", userID, "error", err)
		writeError(w, http.StatusInternalServerError, "NOTIFICATION_COUNT_FAILED", "Failed to fetch unread count")
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"unreadCount": count})
}

func (s *Server) markAllRead(w http.ResponseWriter, r *http.Request) {
	userID := strings.TrimSpace(r.Header.Get("X-User-Id"))
	updatedCount, err := s.repo.MarkAllAsRead(r.Context(), userID)
	if err != nil {
		s.logger.Error("failed to mark all notifications as read", "userId", userID, "error", err)
		writeError(w, http.StatusInternalServerError, "NOTIFICATION_UPDATE_FAILED", "Failed to mark all notifications as read")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"message":      "All notifications marked as read",
		"updatedCount": updatedCount,
	})
}

func (s *Server) markRead(w http.ResponseWriter, r *http.Request) {
	if !strings.HasSuffix(r.URL.Path, "/read") {
		http.NotFound(w, r)
		return
	}
	notificationID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/notifications/"), "/read")
	notificationID = strings.Trim(notificationID, "/")
	if notificationID == "" {
		http.NotFound(w, r)
		return
	}

	userID := strings.TrimSpace(r.Header.Get("X-User-Id"))
	receiverID, err := s.repo.FindNotificationOwner(r.Context(), notificationID)
	if errors.Is(err, notificationMySQL.ErrNotFound) {
		writeError(w, http.StatusNotFound, "NOTIFICATION_NOT_FOUND", "Notification not found")
		return
	}
	if err != nil {
		s.logger.Error("failed to fetch notification owner", "notificationId", notificationID, "error", err)
		writeError(w, http.StatusInternalServerError, "NOTIFICATION_FETCH_FAILED", "Failed to fetch notification")
		return
	}
	if receiverID != userID {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "You do not have permission to mark this notification as read")
		return
	}

	if err := s.repo.MarkAsRead(r.Context(), notificationID); err != nil {
		if errors.Is(err, notificationMySQL.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOTIFICATION_NOT_FOUND", "Notification not found")
			return
		}
		s.logger.Error("failed to mark notification as read", "notificationId", notificationID, "userId", userID, "error", err)
		writeError(w, http.StatusInternalServerError, "NOTIFICATION_UPDATE_FAILED", "Failed to mark notification as read")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Notification marked as read"})
}

func (s *Server) withInternalAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.internalServiceToken != "" && r.Header.Get("X-Internal-Service-Token") != s.internalServiceToken {
			writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid internal service token")
			return
		}
		if strings.TrimSpace(r.Header.Get("X-User-Id")) == "" {
			writeError(w, http.StatusBadRequest, "MISSING_USER_ID", "X-User-Id header is required")
			return
		}
		next(w, r)
	}
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
			"query", r.URL.RawQuery,
			"status", recorder.status,
			"bytes", recorder.bytes,
			"durationMs", time.Since(start).Milliseconds(),
			"remoteAddr", r.RemoteAddr,
			"userAgent", r.UserAgent(),
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

func queryInt(r *http.Request, key string, fallback, min, max int) int {
	value, err := strconv.Atoi(r.URL.Query().Get(key))
	if err != nil {
		return fallback
	}
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func queryBool(r *http.Request, key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(r.URL.Query().Get(key)))
	switch value {
	case "true", "1", "yes":
		return true
	case "false", "0", "no":
		return false
	default:
		return fallback
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

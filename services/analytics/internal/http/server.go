package http

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	analyticsCache "github.com/travelnest/services/analytics/internal/cache"
	"github.com/travelnest/services/analytics/internal/mongo"
)

type Server struct {
	repo                         *mongo.Repository
	cache                        *analyticsCache.RedisCache
	trendingHotelsCacheTTL       time.Duration
	trendingDestinationsCacheTTL time.Duration
	logger                       *slog.Logger
}

func NewServer(
	repo *mongo.Repository,
	cache *analyticsCache.RedisCache,
	trendingHotelsCacheTTL time.Duration,
	trendingDestinationsCacheTTL time.Duration,
	logger *slog.Logger,
) http.Handler {
	if logger == nil {
		logger = slog.Default()
	}
	server := &Server{
		repo:                         repo,
		cache:                        cache,
		trendingHotelsCacheTTL:       trendingHotelsCacheTTL,
		trendingDestinationsCacheTTL: trendingDestinationsCacheTTL,
		logger:                       logger,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", server.healthz)
	mux.HandleFunc("GET /analytics/trending/hotels", server.trendingHotels)
	mux.HandleFunc("GET /analytics/trending/destinations", server.trendingDestinations)
	mux.HandleFunc("GET /analytics/search/demand", server.searchDemand)
	mux.HandleFunc("GET /analytics/users/", server.userAnalytics)
	return server.logRequests(mux)
}

func (s *Server) healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) trendingHotels(w http.ResponseWriter, r *http.Request) {
	limit := queryInt(r, "limit", 10, 1, 100)
	days := queryInt(r, "days", 2, 1, 365)
	s.logger.Debug("fetching trending hotels", "limit", limit, "days", days)

	if s.cache != nil && s.trendingHotelsCacheTTL > 0 {
		rows, found, err := s.cache.GetTrendingHotels(r.Context(), limit, days)
		if err != nil {
			s.logger.Warn("failed to read trending hotels cache", "limit", limit, "days", days, "error", err)
		}
		if found {
			s.logger.Debug("trending hotels cache hit", "limit", limit, "days", days)
			writeJSON(w, http.StatusOK, rows)
			return
		}
		s.logger.Debug("trending hotels cache miss", "limit", limit, "days", days)
	}

	rows, err := s.repo.TrendingHotels(r.Context(), limit, days)
	if err != nil {
		s.logger.Error("failed to fetch trending hotels", "limit", limit, "days", days, "error", err)
		respond(w, rows, err)
		return
	}
	if s.cache != nil && s.trendingHotelsCacheTTL > 0 {
		if err := s.cache.SetTrendingHotels(r.Context(), limit, days, rows, s.trendingHotelsCacheTTL); err != nil {
			s.logger.Warn("failed to write trending hotels cache", "limit", limit, "days", days, "error", err)
		}
	}
	writeJSON(w, http.StatusOK, rows)
}

func (s *Server) trendingDestinations(w http.ResponseWriter, r *http.Request) {
	limit := queryInt(r, "limit", 5, 1, 100)
	days := queryInt(r, "days", 30, 1, 365)
	s.logger.Debug("fetching trending destinations", "limit", limit, "days", days)

	if s.cache != nil && s.trendingDestinationsCacheTTL > 0 {
		rows, found, err := s.cache.GetTrendingDestinations(r.Context(), limit, days)
		if err != nil {
			s.logger.Warn("failed to read trending destinations cache", "limit", limit, "days", days, "error", err)
		}
		if found {
			s.logger.Debug("trending destinations cache hit", "limit", limit, "days", days)
			writeJSON(w, http.StatusOK, rows)
			return
		}
		s.logger.Debug("trending destinations cache miss", "limit", limit, "days", days)
	}

	rows, err := s.repo.TrendingDestinations(r.Context(), limit, days)
	if err != nil {
		s.logger.Error("failed to fetch trending destinations", "limit", limit, "days", days, "error", err)
		respond(w, rows, err)
		return
	}
	if s.cache != nil && s.trendingDestinationsCacheTTL > 0 {
		if err := s.cache.SetTrendingDestinations(r.Context(), limit, days, rows, s.trendingDestinationsCacheTTL); err != nil {
			s.logger.Warn("failed to write trending destinations cache", "limit", limit, "days", days, "error", err)
		}
	}
	writeJSON(w, http.StatusOK, rows)
}

func (s *Server) searchDemand(w http.ResponseWriter, r *http.Request) {
	nextDays := queryInt(r, "nextDays", 90, 1, 365)
	limit := queryInt(r, "limit", 50, 1, 500)
	s.logger.Debug("fetching search demand", "nextDays", nextDays, "limit", limit)

	rows, err := s.repo.SearchDemand(r.Context(), nextDays, limit)
	if err != nil {
		s.logger.Error("failed to fetch search demand", "nextDays", nextDays, "limit", limit, "error", err)
	}
	respond(w, rows, err)
}

func (s *Server) userAnalytics(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/analytics/users/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[0] == "" {
		s.logger.Warn("invalid user analytics path", "path", r.URL.Path)
		http.NotFound(w, r)
		return
	}

	userID := parts[0]
	switch parts[1] {
	case "search-summary":
		s.logger.Debug("fetching user search summary", "userId", userID)
		row, err := s.repo.UserSearchSummary(r.Context(), userID)
		if err != nil {
			s.logger.Error("failed to fetch user search summary", "userId", userID, "error", err)
			respond(w, nil, err)
			return
		}
		if row == nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"userId": userID, "totalSearches": 0, "locationsVisited": []string{}, "uniqueLocations": 0,
			})
			return
		}
		writeJSON(w, http.StatusOK, row)
	case "searches":
		limit := queryInt(r, "limit", 10, 1, 100)
		s.logger.Debug("fetching user searches", "userId", userID, "limit", limit)
		rows, err := s.repo.UserSearches(r.Context(), userID, limit)
		if err != nil {
			s.logger.Error("failed to fetch user searches", "userId", userID, "limit", limit, "error", err)
		}
		respond(w, rows, err)
	default:
		s.logger.Warn("unknown user analytics endpoint", "path", r.URL.Path, "userId", userID, "endpoint", parts[1])
		http.NotFound(w, r)
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

func respond(w http.ResponseWriter, body any, err error) {
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, body)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

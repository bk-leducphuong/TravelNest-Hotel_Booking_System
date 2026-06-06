package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/travelnest/services/analytics/internal/mongo"
)

type Server struct {
	repo *mongo.Repository
}

func NewServer(repo *mongo.Repository) http.Handler {
	server := &Server{repo: repo}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", server.healthz)
	mux.HandleFunc("GET /analytics/trending/hotels", server.trendingHotels)
	mux.HandleFunc("GET /analytics/trending/destinations", server.trendingDestinations)
	mux.HandleFunc("GET /analytics/search/demand", server.searchDemand)
	mux.HandleFunc("GET /analytics/users/", server.userAnalytics)
	return mux
}

func (s *Server) healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) trendingHotels(w http.ResponseWriter, r *http.Request) {
	rows, err := s.repo.TrendingHotels(r.Context(), queryInt(r, "limit", 10), queryInt(r, "days", 2))
	respond(w, rows, err)
}

func (s *Server) trendingDestinations(w http.ResponseWriter, r *http.Request) {
	rows, err := s.repo.TrendingDestinations(r.Context(), queryInt(r, "limit", 5), queryInt(r, "days", 30))
	respond(w, rows, err)
}

func (s *Server) searchDemand(w http.ResponseWriter, r *http.Request) {
	rows, err := s.repo.SearchDemand(r.Context(), queryInt(r, "nextDays", 90), queryInt(r, "limit", 50))
	respond(w, rows, err)
}

func (s *Server) userAnalytics(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/analytics/users/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[0] == "" {
		http.NotFound(w, r)
		return
	}

	switch parts[1] {
	case "search-summary":
		row, err := s.repo.UserSearchSummary(r.Context(), parts[0])
		if err != nil {
			respond(w, nil, err)
			return
		}
		if row == nil {
			writeJSON(w, http.StatusOK, map[string]any{
				"userId": parts[0], "totalSearches": 0, "locationsVisited": []string{}, "uniqueLocations": 0,
			})
			return
		}
		writeJSON(w, http.StatusOK, row)
	case "searches":
		rows, err := s.repo.UserSearches(r.Context(), parts[0], queryInt(r, "limit", 10))
		respond(w, rows, err)
	default:
		http.NotFound(w, r)
	}
}

func queryInt(r *http.Request, key string, fallback int) int {
	value, err := strconv.Atoi(r.URL.Query().Get(key))
	if err != nil {
		return fallback
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

package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// A read query must outlive the caller. The API proxies requests with a short
// timeout; when it aborts, the incoming request context is canceled, which used
// to cancel the Mongo aggregation (erroring out) and leave the Redis cache cold
// so every later call repeated the slow scan.
func TestReadContextSurvivesCallerCancellation(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/analytics/trending/hotels", nil)

	requestCtx, cancelRequest := context.WithCancel(req.Context())
	cancelRequest()
	req = req.WithContext(requestCtx)

	ctx, cancel := readContext(req)
	defer cancel()

	select {
	case <-ctx.Done():
		t.Fatalf("read context was canceled by the caller: %v", ctx.Err())
	case <-time.After(20 * time.Millisecond):
	}
}

// The detached context still needs a bound so a pathological query cannot hold
// a Mongo connection open indefinitely.
func TestReadContextHasDeadline(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/analytics/trending/hotels", nil)

	ctx, cancel := readContext(req)
	defer cancel()

	if _, ok := ctx.Deadline(); !ok {
		t.Fatal("read context should carry a deadline")
	}
}

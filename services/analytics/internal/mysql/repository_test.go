package mysql

import (
	"testing"
	"time"
)

func TestClamp(t *testing.T) {
	if got := clamp(0, 10, 1, 100); got != 10 {
		t.Fatalf("clamp fallback = %d, want 10", got)
	}
	if got := clamp(-5, 10, 1, 100); got != 1 {
		t.Fatalf("clamp min = %d, want 1", got)
	}
	if got := clamp(500, 10, 1, 100); got != 100 {
		t.Fatalf("clamp max = %d, want 100", got)
	}
}

func TestStartOfDayUsesUTC(t *testing.T) {
	input := time.Date(2026, 3, 8, 17, 42, 13, 0, time.FixedZone("ICT", 7*60*60))
	got := startOfDay(input)

	want := time.Date(2026, 3, 8, 0, 0, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Fatalf("startOfDay = %s, want %s", got, want)
	}
}

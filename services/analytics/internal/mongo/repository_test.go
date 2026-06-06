package mongo

import (
	"testing"

	mongodriver "go.mongodb.org/mongo-driver/mongo"
)

func TestIsDuplicateKey(t *testing.T) {
	err := mongodriver.WriteException{
		WriteErrors: []mongodriver.WriteError{{Code: 11000, Message: "duplicate key"}},
	}

	if !IsDuplicateKey(err) {
		t.Fatal("expected duplicate key error to be detected")
	}
}

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

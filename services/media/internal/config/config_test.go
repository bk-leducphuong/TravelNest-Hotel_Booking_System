package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("HTTP_ADDR", "")
	t.Setenv("MAX_UPLOAD_BYTES", "")

	cfg := Load()
	if cfg.HTTPAddr != ":8082" {
		t.Fatalf("HTTPAddr = %q, want :8082", cfg.HTTPAddr)
	}
	if cfg.MaxUploadBytes != 5*1024*1024 {
		t.Fatalf("MaxUploadBytes = %d, want %d", cfg.MaxUploadBytes, 5*1024*1024)
	}
}

func TestLoadMaxUploadBytes(t *testing.T) {
	t.Setenv("MAX_UPLOAD_BYTES", "12345")

	cfg := Load()
	if cfg.MaxUploadBytes != 12345 {
		t.Fatalf("MaxUploadBytes = %d, want 12345", cfg.MaxUploadBytes)
	}
}

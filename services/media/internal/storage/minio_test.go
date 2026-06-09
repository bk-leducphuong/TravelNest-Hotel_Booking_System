package storage

import "testing"

func TestPublicURL(t *testing.T) {
	client := &Client{publicURL: "http://localhost:9000/uploads"}

	got := client.PublicURL("users/avatars/user 1.avif")
	want := "http://localhost:9000/uploads/users/avatars/user%201.avif"
	if got != want {
		t.Fatalf("PublicURL() = %q, want %q", got, want)
	}
}

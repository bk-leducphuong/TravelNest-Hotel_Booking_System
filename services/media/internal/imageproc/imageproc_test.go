package imageproc

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"testing"
)

func TestDecodeMetadata(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 3, 2))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})

	var body bytes.Buffer
	if err := png.Encode(&body, img); err != nil {
		t.Fatal(err)
	}

	metadata := DecodeMetadata(body.Bytes())
	if metadata.Width == nil || *metadata.Width != 3 {
		t.Fatalf("width = %v, want 3", metadata.Width)
	}
	if metadata.Height == nil || *metadata.Height != 2 {
		t.Fatalf("height = %v, want 2", metadata.Height)
	}
}

package imageproc

import (
	"bytes"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
)

type Metadata struct {
	Width  *int
	Height *int
}

func DecodeMetadata(body []byte) Metadata {
	config, _, err := image.DecodeConfig(bytes.NewReader(body))
	if err != nil {
		return Metadata{}
	}
	width := config.Width
	height := config.Height
	return Metadata{Width: &width, Height: &height}
}

func AVIFPlaceholder(body []byte) []byte {
	return body
}

func MediumWebPPlaceholder(body []byte) []byte {
	return body
}

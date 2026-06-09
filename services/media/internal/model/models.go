package model

import "time"

type Image struct {
	ID               string
	EntityType       string
	EntityID         string
	BucketName       string
	ObjectKey        string
	OriginalFilename string
	FileSize         int64
	MimeType         string
	Width            *int
	Height           *int
	HasThumbnail     bool
	HasCompressed    bool
	DisplayOrder     int
	IsPrimary        bool
	Status           string
	UploadedAt       time.Time
	DeletedAt        *time.Time
}

type ImageVariant struct {
	ID          string
	ImageID     string
	VariantType string
	BucketName  string
	ObjectKey   string
	FileSize    int64
	Width       *int
	Height      *int
	CreatedAt   time.Time
}

type ImageResponse struct {
	ID               string                          `json:"id"`
	OriginalFilename string                          `json:"originalFilename"`
	FileSize         int64                           `json:"fileSize"`
	MimeType         string                          `json:"mimeType"`
	Width            *int                            `json:"width"`
	Height           *int                            `json:"height"`
	IsPrimary        bool                            `json:"isPrimary"`
	DisplayOrder     int                             `json:"displayOrder"`
	Status           string                          `json:"status"`
	UploadedAt       time.Time                       `json:"uploadedAt"`
	URL              string                          `json:"url"`
	Variants         map[string]ImageVariantResponse `json:"variants"`
}

type ImageVariantResponse struct {
	URL      string `json:"url"`
	Width    *int   `json:"width"`
	Height   *int   `json:"height"`
	FileSize int64  `json:"fileSize"`
}

type UploadImageResult struct {
	ID               string `json:"id"`
	EntityType       string `json:"entityType"`
	EntityID         string `json:"entityId"`
	OriginalFilename string `json:"originalFilename"`
	FileSize         int64  `json:"fileSize"`
	MimeType         string `json:"mimeType"`
	IsPrimary        bool   `json:"isPrimary"`
	Status           string `json:"status"`
	Message          string `json:"message"`
}

type UploadedObject struct {
	Bucket    string
	ObjectKey string
	Size      int64
	MimeType  string
	URL       string
}

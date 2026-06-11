package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/url"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	minio     *minio.Client
	bucket    string
	publicURL string
}

func NewClient(endpoint, accessKey, secretKey, bucket, publicURL string, useSSL bool) (*Client, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}
	return &Client{minio: client, bucket: bucket, publicURL: strings.TrimRight(publicURL, "/")}, nil
}

func (c *Client) EnsureBucket(ctx context.Context) error {
	exists, err := c.minio.BucketExists(ctx, c.bucket)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	return c.minio.MakeBucket(ctx, c.bucket, minio.MakeBucketOptions{Region: "us-east-1"})
}

func (c *Client) Bucket() string {
	return c.bucket
}

func (c *Client) PublicURL(objectKey string) string {
	parts := strings.Split(objectKey, "/")
	for i, part := range parts {
		parts[i] = url.PathEscape(part)
	}
	return c.publicURL + "/" + strings.Join(parts, "/")
}

func (c *Client) Upload(ctx context.Context, objectKey string, body []byte, contentType string) (int64, error) {
	info, err := c.minio.PutObject(
		ctx,
		c.bucket,
		objectKey,
		bytes.NewReader(body),
		int64(len(body)),
		minio.PutObjectOptions{ContentType: contentType},
	)
	if err != nil {
		return 0, err
	}
	return info.Size, nil
}

func (c *Client) Download(ctx context.Context, bucket, objectKey string) ([]byte, error) {
	object, err := c.minio.GetObject(ctx, bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	defer object.Close()
	body, err := io.ReadAll(object)
	if err != nil {
		return nil, err
	}
	return body, nil
}

func (c *Client) CopyWithinBucket(ctx context.Context, sourceKey, destinationKey, contentType string) (int64, error) {
	body, err := c.Download(ctx, c.bucket, sourceKey)
	if err != nil {
		return 0, err
	}
	size, err := c.Upload(ctx, destinationKey, body, contentType)
	if err != nil {
		return 0, fmt.Errorf("copy object: %w", err)
	}
	return size, nil
}

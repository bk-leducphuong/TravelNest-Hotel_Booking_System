output "bucket_name" {
  description = "Bucket name (MINIO_BUCKET)."
  value       = aws_s3_bucket.this.bucket
}

output "bucket_arn" {
  description = "Bucket ARN for IAM policies."
  value       = aws_s3_bucket.this.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name, useful for PUBLIC_OBJECT_BASE_URL."
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

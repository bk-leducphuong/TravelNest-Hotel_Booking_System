output "state_bucket" {
  description = "S3 bucket that holds Terraform state."
  value       = aws_s3_bucket.state.bucket
}

output "lock_table" {
  description = "DynamoDB table used for state locking."
  value       = aws_dynamodb_table.lock.name
}

output "aws_region" {
  description = "Region the state resources live in."
  value       = var.aws_region
}

output "backend_config" {
  description = "Paste this into environments/<env>/backend.tf."
  value       = <<-EOT
    bucket         = "${aws_s3_bucket.state.bucket}"
    region         = "${var.aws_region}"
    dynamodb_table = "${aws_dynamodb_table.lock.name}"
    encrypt        = true
  EOT
}

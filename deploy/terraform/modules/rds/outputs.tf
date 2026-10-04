output "address" {
  description = "RDS writer endpoint hostname."
  value       = aws_db_instance.this.address
}

output "port" {
  description = "RDS port."
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "Initial database name."
  value       = aws_db_instance.this.db_name
}

output "username" {
  description = "Master username."
  value       = aws_db_instance.this.username
}

output "master_user_secret_arn" {
  description = "ARN of the AWS-managed master password secret. Retrieve with `aws secretsmanager get-secret-value` and seal into SOPS."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "security_group_id" {
  description = "RDS security group ID."
  value       = aws_security_group.this.id
}

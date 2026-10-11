output "primary_endpoint_address" {
  description = "Primary endpoint hostname to write to (REDIS_HOST)."
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "Reader endpoint hostname."
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "Redis port (REDIS_PORT)."
  value       = aws_elasticache_replication_group.this.port
}

output "security_group_id" {
  description = "Redis security group ID."
  value       = aws_security_group.this.id
}

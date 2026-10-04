output "cert_manager_role_arn" {
  description = "IRSA role ARN for cert-manager."
  value       = aws_iam_role.irsa["cert-manager"].arn
}

output "external_dns_role_arn" {
  description = "IRSA role ARN for external-dns."
  value       = aws_iam_role.irsa["external-dns"].arn
}

output "cluster_autoscaler_role_arn" {
  description = "IRSA role ARN for cluster-autoscaler."
  value       = aws_iam_role.irsa["cluster-autoscaler"].arn
}

output "s3_access_key_id" {
  description = "Access key ID for the application S3 user (seal into SOPS, never commit)."
  value       = try(aws_iam_access_key.s3[0].id, null)
  sensitive   = true
}

output "s3_secret_access_key" {
  description = "Secret access key for the application S3 user (seal into SOPS, never commit)."
  value       = try(aws_iam_access_key.s3[0].secret, null)
  sensitive   = true
}

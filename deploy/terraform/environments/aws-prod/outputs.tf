output "aws_region" {
  value = var.aws_region
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "configure_kubectl" {
  description = "Command to point kubectl at the new cluster."
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "default_storage_class" {
  value = module.addons.default_storage_class
}

output "argocd_namespace" {
  value = module.addons.argocd_namespace
}

# ---------------------------------------------------------------------------
# Managed data — feed these into deploy/k8s/.env.prod, then re-seal with SOPS.
# ---------------------------------------------------------------------------
output "db_host" {
  value = module.rds.address
}

output "db_port" {
  value = module.rds.port
}

output "db_name" {
  value = module.rds.db_name
}

output "db_user" {
  value = module.rds.username
}

output "db_master_user_secret_arn" {
  description = "Retrieve the password: aws secretsmanager get-secret-value --secret-id <arn> --query SecretString --output text | jq -r .password"
  value       = module.rds.master_user_secret_arn
}

output "redis_host" {
  value = module.elasticache.primary_endpoint_address
}

output "redis_port" {
  value = module.elasticache.port
}

output "media_bucket_name" {
  value = module.s3.bucket_name
}

output "media_bucket_domain" {
  value = module.s3.bucket_regional_domain_name
}

output "s3_access_key_id" {
  value     = module.iam.s3_access_key_id
  sensitive = true
}

output "s3_secret_access_key" {
  value     = module.iam.s3_secret_access_key
  sensitive = true
}

# ---------------------------------------------------------------------------
# DNS
# ---------------------------------------------------------------------------
output "route53_zone_id" {
  value = module.dns.zone_id
}

output "route53_name_servers" {
  description = "If the zone was newly created, set these as the registrar's NS records."
  value       = module.dns.name_servers
}

output "env_prod_hint" {
  description = "Values to place in deploy/k8s/.env.prod (secrets excluded; retrieve the DB password from Secrets Manager)."
  value = {
    DB_HOST        = module.rds.address
    DB_PORT        = tostring(module.rds.port)
    DB_NAME        = module.rds.db_name
    DB_USER        = module.rds.username
    REDIS_HOST     = module.elasticache.primary_endpoint_address
    REDIS_PORT     = tostring(module.elasticache.port)
    MINIO_ENDPOINT = "s3.${var.aws_region}.amazonaws.com"
    MINIO_PORT     = "443"
    MINIO_USE_SSL  = "true"
    MINIO_BUCKET   = module.s3.bucket_name
  }
}

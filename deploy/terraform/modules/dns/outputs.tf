output "zone_id" {
  description = "Route53 hosted zone ID (pass to external-dns / cert-manager)."
  value       = local.zone_id
}

output "zone_arn" {
  description = "Route53 hosted zone ARN (scopes the IRSA policy)."
  value       = local.zone_arn
}

output "name_servers" {
  description = "NS records. If the zone was newly created, point the registrar at these."
  value       = local.name_servers
}

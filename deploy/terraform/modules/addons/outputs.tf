output "argocd_namespace" {
  description = "Namespace Argo CD is installed in."
  value       = helm_release.argocd.namespace
}

output "traefik_namespace" {
  description = "Namespace Traefik is installed in."
  value       = helm_release.traefik.namespace
}

output "default_storage_class" {
  description = "Name of the default StorageClass created for the cluster."
  value       = kubernetes_storage_class_v1.gp3.metadata[0].name
}

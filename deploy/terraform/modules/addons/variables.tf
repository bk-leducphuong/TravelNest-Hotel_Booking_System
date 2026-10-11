variable "cluster_name" {
  description = "EKS cluster name (used by cluster-autoscaler autoDiscovery)."
  type        = string
}

variable "region" {
  description = "AWS region (used by cert-manager Route53 solver and cluster-autoscaler)."
  type        = string
}

variable "domain_name" {
  description = "Apex domain managed by external-dns and used by the Let's Encrypt issuer."
  type        = string
}

variable "letsencrypt_email" {
  description = "Contact email for Let's Encrypt."
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID."
  type        = string
}

variable "cert_manager_role_arn" {
  description = "IRSA role ARN for cert-manager."
  type        = string
}

variable "external_dns_role_arn" {
  description = "IRSA role ARN for external-dns."
  type        = string
}

variable "cluster_autoscaler_role_arn" {
  description = "IRSA role ARN for cluster-autoscaler."
  type        = string
}

variable "helm_values_dir" {
  description = "Absolute path to deploy/helm/platform (values-only charts)."
  type        = string
}

variable "enable_external_dns" {
  description = "Install external-dns (Route53)."
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Install kube-prometheus-stack."
  type        = bool
  default     = false
}

variable "manage_gp2_default" {
  description = "Clear the default-class annotation on the EKS-created gp2 StorageClass so gp3 becomes the only default."
  type        = bool
  default     = true
}

variable "traefik_chart_version" {
  description = "Traefik chart version."
  type        = string
  default     = "41.6.0"
}

variable "argo_cd_chart_version" {
  description = "argo-cd chart version."
  type        = string
  default     = "10.9.2"
}

variable "cert_manager_chart_version" {
  description = "cert-manager chart version."
  type        = string
  default     = "v1.21.2"
}

variable "metrics_server_chart_version" {
  description = "metrics-server chart version."
  type        = string
  default     = "3.14.0"
}

variable "cluster_autoscaler_chart_version" {
  description = "cluster-autoscaler chart version."
  type        = string
  default     = "9.59.0"
}

variable "external_dns_chart_version" {
  description = "external-dns chart version."
  type        = string
  default     = "1.22.0"
}

variable "kube_prometheus_stack_chart_version" {
  description = "kube-prometheus-stack chart version."
  type        = string
  default     = "91.4.1"
}

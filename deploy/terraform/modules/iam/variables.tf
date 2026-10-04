variable "name" {
  description = "Name prefix for IAM resources (usually the cluster name)."
  type        = string
}

variable "oidc_provider_arn" {
  description = "EKS IAM OIDC provider ARN."
  type        = string
}

variable "oidc_provider_url" {
  description = "EKS IAM OIDC provider URL with https:// stripped."
  type        = string
}

variable "hosted_zone_arn" {
  description = "Route53 hosted zone ARN that cert-manager and external-dns may edit. Empty uses '*'."
  type        = string
  default     = ""
}

variable "s3_bucket_arn" {
  description = "Media bucket ARN granted to the application IAM user."
  type        = string
  default     = ""
}

variable "create_s3_user" {
  description = "Create a static-access-key IAM user for MinIO-compatible S3 access (until the app supports IRSA)."
  type        = bool
  default     = true
}

variable "cert_manager_namespace" {
  description = "Namespace cert-manager runs in."
  type        = string
  default     = "cert-manager"
}

variable "cert_manager_service_account" {
  description = "cert-manager service account name."
  type        = string
  default     = "cert-manager"
}

variable "external_dns_namespace" {
  description = "Namespace external-dns runs in."
  type        = string
  default     = "external-dns"
}

variable "external_dns_service_account" {
  description = "external-dns service account name."
  type        = string
  default     = "external-dns"
}

variable "cluster_autoscaler_namespace" {
  description = "Namespace cluster-autoscaler runs in."
  type        = string
  default     = "kube-system"
}

variable "cluster_autoscaler_service_account" {
  description = "cluster-autoscaler service account name."
  type        = string
  default     = "cluster-autoscaler"
}

variable "tags" {
  description = "Tags applied to resources."
  type        = map(string)
  default     = {}
}

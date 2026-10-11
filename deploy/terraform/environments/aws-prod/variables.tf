variable "aws_region" {
  description = "AWS region for the environment."
  type        = string
  default     = "ap-southeast-1"
}

variable "project" {
  description = "Project slug used in resource names and tags."
  type        = string
  default     = "travelnest"
}

variable "environment" {
  description = "Environment name (prod, staging, ...)."
  type        = string
  default     = "prod"
}

variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
  default     = "travelnest-prod"
}

variable "cluster_version" {
  description = "Kubernetes version."
  type        = string
  default     = "1.30"
}

variable "vpc_cidr" {
  description = "VPC CIDR."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Availability zones to span."
  type        = number
  default     = 3
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway (cheaper) instead of one per AZ."
  type        = bool
  default     = true
}

variable "endpoint_public_access_cidrs" {
  description = "CIDRs allowed to reach the public Kubernetes API endpoint. Restrict to your admin IPs."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_group" {
  description = "Managed node group sizing."
  type = object({
    instance_types = list(string)
    capacity_type  = string
    ami_type       = string
    disk_size      = number
    min_size       = number
    max_size       = number
    desired_size   = number
    labels         = map(string)
  })
  default = {
    instance_types = ["m6i.large"]
    capacity_type  = "ON_DEMAND"
    ami_type       = "AL2023_x86_64_STANDARD"
    disk_size      = 50
    min_size       = 2
    max_size       = 6
    desired_size   = 2
    labels         = {}
  }
}

# ---------------------------------------------------------------------------
# Data services (managed)
# ---------------------------------------------------------------------------
variable "db_name" {
  description = "Application database name."
  type        = string
  default     = "travelnest"
}

variable "db_username" {
  description = "RDS master username. RDS manages the password in Secrets Manager."
  type        = string
  default     = "travelnest"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_multi_az" {
  description = "Run RDS Multi-AZ."
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.medium"
}

variable "redis_num_cache_clusters" {
  description = "ElastiCache node count (>1 enables failover)."
  type        = number
  default     = 2
}

variable "media_bucket_name" {
  description = "Media bucket name prefix (random suffix appended)."
  type        = string
  default     = "travelnest-media"
}

# ---------------------------------------------------------------------------
# DNS / TLS
# ---------------------------------------------------------------------------
variable "domain_name" {
  description = "Apex domain the platform serves."
  type        = string
  default     = "deployserver.work"
}

variable "create_hosted_zone" {
  description = "Create a Route53 hosted zone for domain_name (false = look up an existing one)."
  type        = bool
  default     = true
}

variable "letsencrypt_email" {
  description = "Contact email for Let's Encrypt."
  type        = string
}

# ---------------------------------------------------------------------------
# Add-ons
# ---------------------------------------------------------------------------
variable "enable_external_dns" {
  description = "Install external-dns."
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Install kube-prometheus-stack."
  type        = bool
  default     = false
}

variable "extra_tags" {
  description = "Additional tags merged into every resource."
  type        = map(string)
  default     = {}
}

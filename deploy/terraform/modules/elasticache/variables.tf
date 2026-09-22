variable "name" {
  description = "ElastiCache replication group ID."
  type        = string
}

variable "vpc_id" {
  description = "VPC to create the cluster in."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for the cache subnet group."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security groups allowed to reach Redis (typically the EKS cluster/node SGs)."
  type        = list(string)
  default     = []
}

variable "node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.medium"
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (1 = single node, >1 enables failover/Multi-AZ)."
  type        = number
  default     = 2
}

variable "engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

variable "transit_encryption_enabled" {
  description = "Enable TLS in transit. Leave false until the app's Redis client uses rediss://."
  type        = bool
  default     = false
}

variable "auth_token" {
  description = "AUTH token when transit encryption is enabled."
  type        = string
  default     = null
  sensitive   = true
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain automatic snapshots."
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags applied to resources."
  type        = map(string)
  default     = {}
}

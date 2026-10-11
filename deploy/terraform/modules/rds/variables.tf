variable "name" {
  description = "RDS instance identifier."
  type        = string
}

variable "vpc_id" {
  description = "VPC to create the database in."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for the DB subnet group."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security groups allowed to reach MySQL (typically the EKS cluster/node SGs)."
  type        = list(string)
  default     = []
}

variable "engine_version" {
  description = "MySQL engine version."
  type        = string
  default     = "8.0"
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.medium"
}

variable "allocated_storage" {
  description = "Initial storage in GiB."
  type        = number
  default     = 50
}

variable "max_allocated_storage" {
  description = "Storage autoscaling ceiling in GiB."
  type        = number
  default     = 200
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "travelnest"
}

variable "username" {
  description = "Master username (RDS manages the password in Secrets Manager)."
  type        = string
  default     = "travelnest"
}

variable "multi_az" {
  description = "Deploy a standby in a second AZ."
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Automated backup retention in days."
  type        = number
  default     = 14
}

variable "deletion_protection" {
  description = "Block accidental `terraform destroy` of the database."
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot on destroy (set false for production)."
  type        = bool
  default     = false
}

variable "apply_immediately" {
  description = "Apply changes immediately instead of during the maintenance window."
  type        = bool
  default     = false
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to resources."
  type        = map(string)
  default     = {}
}

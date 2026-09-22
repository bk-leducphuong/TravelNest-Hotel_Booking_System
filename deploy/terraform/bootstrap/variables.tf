variable "aws_region" {
  description = "AWS region to create the Terraform state resources in."
  type        = string
  default     = "ap-southeast-1"
}

variable "project" {
  description = "Project slug used to name the state bucket and lock table."
  type        = string
  default     = "travelnest"
}

variable "state_bucket_name" {
  description = "Override the auto-generated Terraform state bucket name. Must be globally unique."
  type        = string
  default     = null
}

variable "lock_table_name" {
  description = "Override the DynamoDB lock table name."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags applied to created resources."
  type        = map(string)
  default = {
    Project   = "travelnest"
    ManagedBy = "terraform"
    Component = "terraform-state"
  }
}

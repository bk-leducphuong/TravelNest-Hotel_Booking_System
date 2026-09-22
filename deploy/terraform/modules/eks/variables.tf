variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the control plane."
  type        = string
  default     = "1.30"
}

variable "vpc_id" {
  description = "VPC to create the cluster in."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for the control plane ENIs and node group."
  type        = list(string)
}

variable "endpoint_public_access" {
  description = "Expose the Kubernetes API endpoint publicly."
  type        = bool
  default     = true
}

variable "endpoint_public_access_cidrs" {
  description = "CIDRs allowed to reach the public API endpoint."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_group" {
  description = "Managed node group configuration."
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

variable "tags" {
  description = "Tags applied to resources."
  type        = map(string)
  default     = {}
}

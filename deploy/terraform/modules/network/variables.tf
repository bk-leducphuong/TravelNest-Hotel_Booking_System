variable "name" {
  description = "Name prefix for network resources."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to spread subnets across."
  type        = number
  default     = 3
}

variable "single_nat_gateway" {
  description = "Use a single NAT gateway (cheaper, no per-AZ egress redundancy)."
  type        = bool
  default     = true
}

variable "cluster_name" {
  description = "EKS cluster name, used to tag subnets for load-balancer discovery. Empty disables the tags."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default     = {}
}

variable "domain_name" {
  description = "Apex domain (e.g. deployserver.work)."
  type        = string
}

variable "create_hosted_zone" {
  description = "Create a new Route53 hosted zone. Set false to look up an existing one by name."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to the hosted zone."
  type        = map(string)
  default     = {}
}

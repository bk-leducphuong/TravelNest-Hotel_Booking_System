variable "name" {
  description = "Bucket name prefix. A random suffix is appended for global uniqueness."
  type        = string
}

variable "force_destroy" {
  description = "Allow bucket deletion even when it contains objects."
  type        = bool
  default     = false
}

variable "noncurrent_expiration_days" {
  description = "Expire noncurrent object versions after N days."
  type        = number
  default     = 30
}

variable "cors_allowed_origins" {
  description = "Origins allowed to access objects directly (e.g. the SPA). Empty disables CORS."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags applied to resources."
  type        = map(string)
  default     = {}
}

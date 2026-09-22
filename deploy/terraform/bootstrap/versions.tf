terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # Keep in sync with modules/*/versions.tf and environments/*/versions.tf.
      version = "~> 5.60"
    }
  }
}

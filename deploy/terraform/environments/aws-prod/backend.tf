# Remote state. Real values come from backend.hcl (see backend.hcl.example):
#   terraform init -backend-config=backend.hcl
terraform {
  backend "s3" {
    key = "deploy/aws-prod/terraform.tfstate"
  }
}

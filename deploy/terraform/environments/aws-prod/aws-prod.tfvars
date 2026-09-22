# Non-secret values for the aws-prod environment.
# Secrets (DB password, JWT, Stripe, SMTP, ...) belong in deploy/k8s/.env.prod
# and are sealed with SOPS — never here.

aws_region   = "ap-southeast-1"
project      = "travelnest"
environment  = "prod"
cluster_name = "travelnest-prod"

# Restrict this to your admin egress IPs before applying to a real account.
endpoint_public_access_cidrs = ["0.0.0.0/0"]

node_group = {
  instance_types = ["m6i.large"]
  capacity_type  = "ON_DEMAND"
  ami_type       = "AL2023_x86_64_STANDARD"
  disk_size      = 50
  min_size       = 2
  max_size       = 6
  desired_size   = 2
  labels         = {}
}

# Managed data
db_instance_class        = "db.t4g.medium"
db_multi_az              = true
redis_node_type          = "cache.t4g.medium"
redis_num_cache_clusters = 2

# DNS / TLS
domain_name        = "deployserver.work"
create_hosted_zone = true
letsencrypt_email  = "devops@deployserver.work"

# Add-ons
enable_external_dns = true
enable_monitoring   = false

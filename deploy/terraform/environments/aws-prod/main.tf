locals {
  tags = merge(
    {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.extra_tags,
  )

  helm_values_dir = abspath("${path.module}/../../../helm/platform")
  k8s_dir         = abspath("${path.module}/../../../k8s")
}

# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------
module "network" {
  source = "../../modules/network"

  name               = "${var.project}-${var.environment}"
  vpc_cidr           = var.vpc_cidr
  az_count           = var.az_count
  single_nat_gateway = var.single_nat_gateway
  cluster_name       = var.cluster_name
  tags               = local.tags
}

# ---------------------------------------------------------------------------
# EKS
# ---------------------------------------------------------------------------
module "eks" {
  source = "../../modules/eks"

  cluster_name                 = var.cluster_name
  cluster_version              = var.cluster_version
  vpc_id                       = module.network.vpc_id
  subnet_ids                   = module.network.private_subnet_ids
  endpoint_public_access_cidrs = var.endpoint_public_access_cidrs
  node_group                   = var.node_group
  tags                         = local.tags
}

# ---------------------------------------------------------------------------
# DNS
# ---------------------------------------------------------------------------
module "dns" {
  source = "../../modules/dns"

  domain_name        = var.domain_name
  create_hosted_zone = var.create_hosted_zone
  tags               = local.tags
}

# ---------------------------------------------------------------------------
# Media bucket
# ---------------------------------------------------------------------------
module "s3" {
  source = "../../modules/s3"

  name                 = var.media_bucket_name
  cors_allowed_origins = ["https://${var.domain_name}"]
  tags                 = local.tags
}

# ---------------------------------------------------------------------------
# IAM (IRSA + application S3 user)
# ---------------------------------------------------------------------------
module "iam" {
  source = "../../modules/iam"

  name              = var.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  hosted_zone_arn   = module.dns.zone_arn
  s3_bucket_arn     = module.s3.bucket_arn
  tags              = local.tags
}

# ---------------------------------------------------------------------------
# RDS MySQL
# ---------------------------------------------------------------------------
module "rds" {
  source = "../../modules/rds"

  name                       = "${var.project}-${var.environment}-mysql"
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.private_subnet_ids
  allowed_security_group_ids = [module.eks.cluster_security_group_id]
  db_name                    = var.db_name
  username                   = var.db_username
  instance_class             = var.db_instance_class
  multi_az                   = var.db_multi_az
  tags                       = local.tags
}

# ---------------------------------------------------------------------------
# ElastiCache Redis
# ---------------------------------------------------------------------------
module "elasticache" {
  source = "../../modules/elasticache"

  name                       = "${var.project}-${var.environment}-redis"
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.private_subnet_ids
  allowed_security_group_ids = [module.eks.cluster_security_group_id]
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_num_cache_clusters
  tags                       = local.tags
}

# ---------------------------------------------------------------------------
# Platform add-ons (Helm) + default StorageClass
# ---------------------------------------------------------------------------
module "addons" {
  source = "../../modules/addons"

  cluster_name                = module.eks.cluster_name
  region                      = var.aws_region
  domain_name                 = var.domain_name
  letsencrypt_email           = var.letsencrypt_email
  hosted_zone_id              = module.dns.zone_id
  cert_manager_role_arn       = module.iam.cert_manager_role_arn
  external_dns_role_arn       = module.iam.external_dns_role_arn
  cluster_autoscaler_role_arn = module.iam.cluster_autoscaler_role_arn
  helm_values_dir             = local.helm_values_dir
  enable_external_dns         = var.enable_external_dns
  enable_monitoring           = var.enable_monitoring

  providers = {
    helm       = helm
    kubernetes = kubernetes
    kubectl    = kubectl
  }
}

# ---------------------------------------------------------------------------
# Argo CD root Application (app-of-apps)
#
# Applied by Terraform once Argo CD exists. Argo CD then syncs
# deploy/k8s/environments/prod. The `sops-age` Secret must be created in the
# argocd namespace (out of band) before the app-of-apps can decrypt secrets.
# ---------------------------------------------------------------------------
resource "kubectl_manifest" "argocd_root_application" {
  yaml_body = file("${local.k8s_dir}/bootstrap/argocd/root-application.yaml")

  depends_on = [module.addons]
}

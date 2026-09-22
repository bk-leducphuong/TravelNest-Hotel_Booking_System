# ---------------------------------------------------------------------------
# Default StorageClass
#
# Every stateful workload in deploy/k8s uses volumeClaimTemplates without a
# storageClassName, so the cluster must have exactly one default StorageClass.
# EKS ships a default gp2 class; we create gp3 and clear gp2's default flag.
# ---------------------------------------------------------------------------
resource "kubernetes_storage_class_v1" "gp3" {
  metadata {
    name = "gp3"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }

  storage_provisioner    = "ebs.csi.aws.com"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true
  reclaim_policy         = "Delete"

  parameters = {
    type   = "gp3"
    fsType = "ext4"
  }
}

resource "kubernetes_annotations" "gp2_not_default" {
  count = var.manage_gp2_default ? 1 : 0

  api_version = "storage.k8s.io/v1"
  kind        = "StorageClass"

  metadata {
    name = "gp2"
  }

  annotations = {
    "storageclass.kubernetes.io/is-default-class" = "false"
  }
}

# ---------------------------------------------------------------------------
# metrics-server
# ---------------------------------------------------------------------------
resource "helm_release" "metrics_server" {
  name       = "metrics-server"
  namespace  = "kube-system"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  version    = var.metrics_server_chart_version

  values = [file("${var.helm_values_dir}/metrics-server/values-aws-prod.yaml")]
}

# ---------------------------------------------------------------------------
# Traefik (ingress controller; the manifests hardcode ingressClassName: traefik)
# ---------------------------------------------------------------------------
resource "helm_release" "traefik" {
  name             = "traefik"
  namespace        = "traefik"
  create_namespace = true
  repository       = "https://traefik.github.io/charts"
  chart            = "traefik"
  version          = var.traefik_chart_version
  timeout          = 600

  values = [file("${var.helm_values_dir}/traefik/values-aws-prod.yaml")]
}

# ---------------------------------------------------------------------------
# cert-manager (+ Let's Encrypt ClusterIssuer via Route53 DNS-01)
# ---------------------------------------------------------------------------
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = var.cert_manager_chart_version
  timeout          = 600

  values = [file("${var.helm_values_dir}/cert-manager/values-aws-prod.yaml")]

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.cert_manager_role_arn
  }
}

resource "kubectl_manifest" "letsencrypt_issuer" {
  yaml_body = <<-YAML
    apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    metadata:
      name: letsencrypt-prod
    spec:
      acme:
        server: https://acme-v02.api.letsencrypt.org/directory
        email: ${var.letsencrypt_email}
        privateKeySecretRef:
          name: letsencrypt-prod
        solvers:
          - dns01:
              route53:
                region: ${var.region}
                hostedZoneID: ${var.hosted_zone_id}
    YAML

  depends_on = [helm_release.cert_manager]
}

# ---------------------------------------------------------------------------
# cluster-autoscaler
# ---------------------------------------------------------------------------
resource "helm_release" "cluster_autoscaler" {
  name       = "cluster-autoscaler"
  namespace  = "kube-system"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  version    = var.cluster_autoscaler_chart_version

  values = [file("${var.helm_values_dir}/cluster-autoscaler/values-aws-prod.yaml")]

  set {
    name  = "autoDiscovery.clusterName"
    value = var.cluster_name
  }

  set {
    name  = "awsRegion"
    value = var.region
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.cluster_autoscaler_role_arn
  }

  depends_on = [helm_release.metrics_server]
}

# ---------------------------------------------------------------------------
# external-dns (Route53; wildcard record for the Traefik NLB)
# ---------------------------------------------------------------------------
resource "helm_release" "external_dns" {
  count = var.enable_external_dns ? 1 : 0

  name             = "external-dns"
  namespace        = "external-dns"
  create_namespace = true
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  version          = var.external_dns_chart_version

  values = [file("${var.helm_values_dir}/external-dns/values-aws-prod.yaml")]

  set {
    name  = "provider"
    value = "aws"
  }

  set {
    name  = "txtOwnerId"
    value = var.cluster_name
  }

  set {
    name  = "domainFilters[0]"
    value = var.domain_name
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.external_dns_role_arn
  }

  depends_on = [helm_release.traefik]
}

# ---------------------------------------------------------------------------
# Argo CD (GitOps engine; KSOPS/Image Updater are patched afterwards)
# ---------------------------------------------------------------------------
resource "helm_release" "argocd" {
  name             = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = var.argo_cd_chart_version
  timeout          = 900

  values = [file("${var.helm_values_dir}/argo-cd/values-aws-prod.yaml")]
}

# ---------------------------------------------------------------------------
# Optional: kube-prometheus-stack
# ---------------------------------------------------------------------------
resource "helm_release" "kube_prometheus_stack" {
  count = var.enable_monitoring ? 1 : 0

  name             = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = var.kube_prometheus_stack_chart_version
  timeout          = 900

  values = [file("${var.helm_values_dir}/kube-prometheus-stack/values-aws-prod.yaml")]

  depends_on = [kubernetes_storage_class_v1.gp3]
}

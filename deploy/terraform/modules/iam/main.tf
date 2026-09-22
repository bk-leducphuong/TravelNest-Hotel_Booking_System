locals {
  irsa = {
    "cert-manager" = {
      namespace       = var.cert_manager_namespace
      service_account = var.cert_manager_service_account
    }
    "external-dns" = {
      namespace       = var.external_dns_namespace
      service_account = var.external_dns_service_account
    }
    "cluster-autoscaler" = {
      namespace       = var.cluster_autoscaler_namespace
      service_account = var.cluster_autoscaler_service_account
    }
  }

  route53_resources = var.hosted_zone_arn == "" ? ["*"] : [var.hosted_zone_arn]
}

data "aws_iam_policy_document" "irsa_assume" {
  for_each = local.irsa

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${each.value.namespace}:${each.value.service_account}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "irsa" {
  for_each = local.irsa

  name               = "${var.name}-${each.key}"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume[each.key].json

  tags = var.tags
}

# ---------------------------------------------------------------------------
# cert-manager: Route53 DNS-01
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "cert_manager" {
  statement {
    sid       = "ChangeResourceRecordSets"
    effect    = "Allow"
    actions   = ["route53:ChangeResourceRecordSets"]
    resources = local.route53_resources
  }

  statement {
    sid    = "ReadHostedZones"
    effect = "Allow"
    actions = [
      "route53:GetChange",
      "route53:ListHostedZones",
      "route53:ListHostedZonesByName",
      "route53:ListResourceRecordSets",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "cert_manager" {
  name   = "${var.name}-cert-manager"
  policy = data.aws_iam_policy_document.cert_manager.json
  tags   = var.tags
}

resource "aws_iam_role_policy_attachment" "cert_manager" {
  role       = aws_iam_role.irsa["cert-manager"].name
  policy_arn = aws_iam_policy.cert_manager.arn
}

# ---------------------------------------------------------------------------
# external-dns
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "external_dns" {
  statement {
    sid       = "ChangeResourceRecordSets"
    effect    = "Allow"
    actions   = ["route53:ChangeResourceRecordSets"]
    resources = local.route53_resources
  }

  statement {
    sid    = "ReadHostedZones"
    effect = "Allow"
    actions = [
      "route53:GetChange",
      "route53:ListHostedZones",
      "route53:ListHostedZonesByName",
      "route53:ListResourceRecordSets",
      "route53:ListTagsForResource",
      "route53:ListTagsForResources",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "external_dns" {
  name   = "${var.name}-external-dns"
  policy = data.aws_iam_policy_document.external_dns.json
  tags   = var.tags
}

resource "aws_iam_role_policy_attachment" "external_dns" {
  role       = aws_iam_role.irsa["external-dns"].name
  policy_arn = aws_iam_policy.external_dns.arn
}

# ---------------------------------------------------------------------------
# cluster-autoscaler
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "cluster_autoscaler" {
  statement {
    effect = "Allow"
    actions = [
      "autoscaling:DescribeAutoScalingGroups",
      "autoscaling:DescribeAutoScalingInstances",
      "autoscaling:DescribeLaunchConfigurations",
      "autoscaling:DescribeScalingActivities",
      "autoscaling:DescribeTags",
      "ec2:DescribeImages",
      "ec2:DescribeInstanceTypes",
      "ec2:DescribeLaunchTemplateVersions",
      "ec2:GetInstanceTypesFromInstanceRequirements",
      "eks:DescribeNodegroup",
    ]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "autoscaling:SetDesiredCapacity",
      "autoscaling:TerminateInstanceInAutoScalingGroup",
    ]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/k8s.io/cluster-autoscaler/enabled"
      values   = ["true"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/k8s.io/cluster-autoscaler/${var.name}"
      values   = ["owned"]
    }
  }
}

resource "aws_iam_policy" "cluster_autoscaler" {
  name   = "${var.name}-cluster-autoscaler"
  policy = data.aws_iam_policy_document.cluster_autoscaler.json
  tags   = var.tags
}

resource "aws_iam_role_policy_attachment" "cluster_autoscaler" {
  role       = aws_iam_role.irsa["cluster-autoscaler"].name
  policy_arn = aws_iam_policy.cluster_autoscaler.arn
}

# ---------------------------------------------------------------------------
# Application S3 user
#
# The Node `minio` client and the Go `minio-go` client only take static
# credentials, so until they use the AWS default credential chain (IRSA) the
# application needs a key pair. Store the output values in deploy/k8s/.env.prod
# and re-seal with the SOPS scripts.
# ---------------------------------------------------------------------------
resource "aws_iam_user" "s3" {
  count = var.create_s3_user ? 1 : 0

  name = "${var.name}-media-s3"
  tags = var.tags
}

resource "aws_iam_access_key" "s3" {
  count = var.create_s3_user ? 1 : 0

  user = aws_iam_user.s3[0].name
}

data "aws_iam_policy_document" "s3" {
  count = var.create_s3_user ? 1 : 0

  statement {
    sid    = "BucketList"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = [var.s3_bucket_arn]
  }

  statement {
    sid    = "ObjectReadWrite"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
      "s3:ListMultipartUploadParts",
    ]
    resources = ["${var.s3_bucket_arn}/*"]
  }
}

resource "aws_iam_user_policy" "s3" {
  count = var.create_s3_user ? 1 : 0

  name   = "${var.name}-media-s3"
  user   = aws_iam_user.s3[0].name
  policy = data.aws_iam_policy_document.s3[0].json
}

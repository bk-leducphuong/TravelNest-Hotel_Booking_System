# TravelNest Deployment & Infrastructure

This directory now contains two deployment tracks:

- `deploy/k8s/` for the active Kubernetes + Argo CD GitOps deployment
- `deploy/docker/` for the legacy Docker Compose stack kept only as a rollback/reference path

## Current Target Architecture

TravelNest now deploys as a mixed Node.js + Go microservice system:

- Public workloads:
  - `frontend`
  - `admin-client`
  - `api`
- Internal workloads:
  - `worker`
  - `analytics`
  - `media`
  - `notification`
- In-cluster stateful services:
  - `mysql`
  - `redis`
  - `minio`
  - `nats`
- External managed services:
  - MongoDB
  - Elasticsearch

Cloudflare Tunnel remains the public entrypoint in phase 1 and forwards traffic
to the `k3s` ingress layer on the VPS.

## Kubernetes GitOps Layout

The active deployment code is under `deploy/k8s/`.

Key entrypoints:

- `deploy/k8s/bootstrap/argocd/root-application.yaml`
- `deploy/k8s/environments/prod/root/kustomization.yaml`
- `deploy/k8s/apps/`
- `deploy/k8s/infra/`

Use `kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml`
after Argo CD is installed.

## CI/CD Model

GitHub Actions now build and push images only.
Deployment is driven by Git changes to manifests under `deploy/k8s/`, which
Argo CD syncs into the cluster.

See `deploy/docs/CICD.md` for the updated flow.

## Legacy Docker Compose

The old Compose stack remains in:

- `deploy/docker/docker-compose.yml`
- `deploy/configs/`
- `deploy/scripts/`

It is no longer the primary deployment path. Keep it only for rollback,
comparison, or migration reference while Kubernetes is being adopted.

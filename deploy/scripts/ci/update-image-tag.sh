#!/usr/bin/env bash
#
# GitOps image promotion (used by the image CI workflows on master).
#
# Rewrites the `newTag` of one image entry in a kustomize overlay so Argo CD
# sees a real manifest change and rolls the workload out to the immutable
# sha-<commit> tag — no Image Updater, no registry polling.
#
#   update-image-tag.sh <kustomization.yaml> <image-name> <new-tag>
#
# Example:
#   update-image-tag.sh deploy/k8s/apps/api/overlays/prod/kustomization.yaml \
#     travelnest-api "sha-abc1234"
#
set -euo pipefail

file="${1:?usage: update-image-tag.sh <kustomization.yaml> <image-name> <new-tag>}"
image="${2:?missing image name}"
tag="${3:?missing tag}"

[ -f "$file" ] || { echo "error: $file not found" >&2; exit 1; }

python3 - "$file" "$image" "$tag" <<'PY'
import re
import sys
import pathlib

path, image, tag = sys.argv[1], sys.argv[2], sys.argv[3]
lines = pathlib.Path(path).read_text().splitlines(keepends=True)

out = []
in_images = False
current = None
hit = False

for line in lines:
    stripped = line.rstrip('\n')

    if re.match(r'^images:\s*$', stripped):
        in_images = True
        out.append(line)
        continue

    # Leave the images block when a new top-level key starts.
    if in_images and stripped and not stripped[0].isspace():
        in_images = False

    entry = re.match(r'^\s*-\s*name:\s*(\S+)\s*$', stripped)
    if in_images and entry:
        current = entry.group(1)

    if in_images and current == image and re.match(r'^\s*newTag:\s*', stripped):
        indent = re.match(r'^(\s*)', line).group(1)
        out.append(f'{indent}newTag: {tag}\n')
        current = None
        hit = True
        continue

    out.append(line)

if not hit:
    sys.exit(f'error: no newTag for image "{image}" in {path}')

pathlib.Path(path).write_text(''.join(out))
print(f'updated {path}: {image} -> {tag}')
PY

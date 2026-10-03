#!/bin/bash
set -euo pipefail

TAG="${1:-latest}"
AWS_REGION="${AWS_REGION:-us-east-1}"
cd "$(dirname "$0")/.."

if [[ ! -f content/questions.json ]]; then
  echo "Run npm run import:questions before building the image."
  exit 1
fi

terraform -chdir=infra init
REPO="$(terraform -chdir=infra output -raw ecr_repository_url)"
ACCOUNT="${REPO%%.*}"

aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"
docker build -t "${REPO}:${TAG}" .
docker push "${REPO}:${TAG}"

echo "Image pushed. Apply the new tag with:"
echo "terraform -chdir=infra apply -var=image_tag=${TAG}"

#!/bin/bash -e

docker login -u "$DOCKER_HUB_USER" -p "$DOCKER_HUB_PASSWORD"
docker login -u "$QUAY_USER" -p "$QUAY_PASSWORD" quay.io

MAKE="make -C scripts/docker-images/release"

$MAKE docker-build

# Push git-sha-tagged image
$MAKE docker-push DOCKER_REGISTRY=quay.io/

# Push tag/branch image
if [ -n "$TRAVIS_TAG" ]; then
    $MAKE docker-push-version
    $MAKE docker-push-version DOCKER_REGISTRY=quay.io/
else
    $MAKE docker-push-version PUSH_DOCKER_TAG=${TRAVIS_BRANCH/master/canary}
    $MAKE docker-push-version DOCKER_REGISTRY=quay.io/ PUSH_DOCKER_TAG=${TRAVIS_BRANCH/master/canary}
fi

#!/bin/bash -e

# Update skygear-node Docker Image

docker login -u "$DOCKER_HUB_USER" -p "$DOCKER_HUB_PASSWORD"
docker login -u "$QUAY_USER" -p "$QUAY_PASSWORD" quay.io

MAKE="make"

$MAKE docker-build

# Push git-sha-tagged image
$MAKE docker-push DOCKER_REGISTRY=quay.io/

# Push tag/branch image
if [ -n "$TRAVIS_TAG" ]; then
    $MAKE docker-push-version PUSH_DOCKER_TAG="${TRAVIS_TAG}"
    $MAKE docker-push-version DOCKER_REGISTRY=quay.io/ PUSH_DOCKER_TAG="${TRAVIS_TAG}"
else
    $MAKE docker-push-version PUSH_DOCKER_TAG="${TRAVIS_BRANCH/master/canary}"
    $MAKE docker-push-version DOCKER_REGISTRY=quay.io/ PUSH_DOCKER_TAG="${TRAVIS_BRANCH/master/canary}"
fi

# Deploy minified JS to CDN

if [ -n "$TRAVIS_TAG" ]; then
    make minify-deploy
fi

if [ "$TRAVIS_TAG" == "latest" ]; then
    make minify-deploy VERSION=latest
fi

# Notify doc.esdoc.org to regenerate esdoc

if [ "$TRAVIS_BRANCH" == "master" ]; then
    make doc-trigger-esdoc
fi

# Update docs.skygear.io

if [ -n "$TRAVIS_TAG" ]; then
    make doc-deploy VERSION="$TRAVIS_TAG"
else
    make doc-deploy VERSION="${TRAVIS_BRANCH/master/canary}"
fi

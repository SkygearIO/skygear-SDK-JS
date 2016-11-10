GIT_SHA := $(shell git rev-parse HEAD)
GIT_SHORT_SHA := $(shell git rev-parse --short HEAD)
VERSION := $(shell git describe --always --tags)
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

DOCKER_REGISTRY := 
DOCKER_ORG_NAME := skygeario
DOCKER_IMAGE := skygear-node
DOCKER_TAG := git-$(shell git rev-parse --short HEAD)
PUSH_DOCKER_TAG := $(VERSION)

IMAGE_NAME := $(DOCKER_ORG_NAME)/$(DOCKER_IMAGE):$(DOCKER_TAG)

.PHONY: clean
clean:
	-m skygear-*.tgz

.PHONY: pack
pack:
	$(MAKE) -C ../../../ clean vendor build
	cp ../../../skygear-*.tgz .

.PHONY: docker-build
docker-build: pack
	docker build -t $(IMAGE_NAME) .
	docker build -t $(IMAGE_NAME)-onbuild -f Dockerfile-onbuild .

.PHONY: docker-push
docker-push:
	docker tag $(IMAGE_NAME) $(DOCKER_REGISTRY)$(IMAGE_NAME)
	docker push $(DOCKER_REGISTRY)$(IMAGE_NAME)
	docker tag $(IMAGE_NAME)-onbuild $(DOCKER_REGISTRY)$(IMAGE_NAME)-onbuild
	docker push $(DOCKER_REGISTRY)$(IMAGE_NAME)-onbuild

.PHONY: docker-push-version
docker-push-version:
	docker tag $(IMAGE_NAME) $(DOCKER_REGISTRY)$(DOCKER_ORG_NAME)/$(DOCKER_IMAGE):$(PUSH_DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)$(DOCKER_ORG_NAME)/$(DOCKER_IMAGE):$(PUSH_DOCKER_TAG)
	docker tag $(IMAGE_NAME)-onbuild $(DOCKER_REGISTRY)$(DOCKER_ORG_NAME)/$(DOCKER_IMAGE):$(PUSH_DOCKER_TAG)-onbuild
	docker push $(DOCKER_REGISTRY)$(DOCKER_ORG_NAME)/$(DOCKER_IMAGE):$(PUSH_DOCKER_TAG)-onbuild

	@if [ "latest" = "$(PUSH_DOCKER_TAG)" ]; then\
		docker tag $(IMAGE_NAME)-onbuild $(DOCKER_REGISTRY)$(DOCKER_ORG_NAME)/$(DOCKER_IMAGE):onbuild;\
		docker push $(DOCKER_REGISTRY)$(DOCKER_ORG_NAME)/$(DOCKER_IMAGE):onbuild;\
	fi

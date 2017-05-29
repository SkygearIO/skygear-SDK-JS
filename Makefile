VERSION := $(shell git describe --always --tags)

DOCKER_COMPOSE_CMD := docker-compose \
	-f docker-compose.dev.yml \
	-p skygear-node-test

ifeq (1,${WITH_DOCKER})
DOCKER_RUN := docker run --rm -i \
	-v `pwd`:/usr/src/app \
	-w /usr/src/app \
	skygeario/skygear-nodedev
DOCKER_COMPOSE_RUN := ${DOCKER_COMPOSE_CMD} run --rm node
endif

.PHONY: vendor
vendor:
	$(DOCKER_RUN) npm install
	$(DOCKER_RUN) npm run lerna bootstrap

.PHONY: test
test:
	$(DOCKER_RUN) npm run test
	$(DOCKER_RUN) sh -c "npm run doc | grep -A 10 \"warning:\"; test \$$? -eq 1"

.PHONY: clean
clean:
	-rm -rf packages/*/dist

.PHONY: build
build:
	$(DOCKER_RUN) sh -c "npm run lerna exec -- npm pack"

.PHONY: doc
doc:
	$(DOCKER_RUN) npm run doc

.PHONY: docker-build
docker-build:
	make -C scripts/docker-images/release docker-build

.PHONY: docker-build
docker-push:
	make -C scripts/docker-images/release docker-push

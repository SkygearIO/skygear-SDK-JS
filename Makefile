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

.PHONY: test
test:
	$(DOCKER_RUN) npm run test

.PHONY: clean
clean:
	-rm -rf dist

.PHONY: build
build:
	$(DOCKER_RUN) npm pack

.PHONY: doc
doc:
	$(DOCKER_RUN) npm run doc

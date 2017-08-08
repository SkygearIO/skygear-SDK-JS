VERSION := $(shell git describe --always --tags --dirty)
DOCS_AWS_BUCKET := docs.skygear.io
DOCS_AWS_DISTRIBUTION := E31J8XF8IPV2V
DOCS_PREFIX = /js/reference

ifeq ($(VERSION),)
$(error VERSION is empty)
endif

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

.PHONY: doc-clean
doc-clean:
	-rm -rf esdoc

.PHONY: doc-upload
doc-upload:
	$(DOCKER_RUN) aws s3 sync esdoc s3://$(DOCS_AWS_BUCKET)$(DOCS_PREFIX)/$(VERSION) --delete

.PHONY: doc-trigger-esdoc
doc-trigger-esdoc:
	curl 'https://doc.esdoc.org/api/create' \
		-XPOST \
		-H 'Content-Type: application/x-www-form-urlencoded' \
		--data 'gitUrl=git%40github.com%3Askygeario%2Fskygear-SDK-JS.git'

.PHONY: doc-invalidate
doc-invalidate:
	$(DOCKER_RUN) aws cloudfront create-invalidation --distribution-id $(DOCS_AWS_DISTRIBUTION) --paths "$(DOCS_PREFIX)/$(VERSION)/*"

.PHONY: doc-deploy
doc-deploy: doc-clean doc doc-upload doc-invalidate

.PHONY: docker-build
docker-build:
	make -C scripts/docker-images/release docker-build

.PHONY: docker-push
docker-push:
	make -C scripts/docker-images/release docker-push

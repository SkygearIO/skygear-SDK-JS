VERSION := $(shell git describe --always)
VERSION_NUM := $(shell git describe --always | sed 's/^v//')
DOCS_AWS_BUCKET := docs.skygear.io
DOCS_AWS_DISTRIBUTION := E31J8XF8IPV2V
DOCS_PREFIX = /js/reference
CODE_AWS_BUCKET := code.skygear.io
CODE_AWS_DISTRIBUTION := E1PUX937CX882Y
CODE_PREFIX = /js/skygear
OS = $(shell uname -s)

ifeq ($(OS),Darwin)
SED := sed -i ""
else
SED := sed -i""
endif

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

.PHONY: release-commit
release-commit:
	./scripts/release-commit.sh

.PHONY: update-version
update-version:
	$(SED) "s/var version = \".*\";/var version = \"$(VERSION)\";/" gulp/context.js

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

.PHONY: minify
minify:
	$(DOCKER_RUN) npm run minify

.PHONY: minify-clean
minify-clean:
	-rm -rf packages/skygear/dist/skygear.min.js*

.PHONY: minify-upload
minify-upload:
	$(DOCKER_RUN) aws s3 sync --exclude '*' --include skygear.min.js* packages/skygear/dist s3://$(CODE_AWS_BUCKET)$(CODE_PREFIX)/$(VERSION_NUM) --delete

.PHONY: minify-invalidate
minify-invalidate:
	$(DOCKER_RUN) aws cloudfront create-invalidation --distribution-id $(CODE_AWS_DISTRIBUTION) --paths "$(CODE_PREFIX)/$(VERSION_NUM)/*"

.PHONY: minify-deploy
minify-deploy: minify-clean minify minify-upload minify-invalidate

.PHONY: docker-build
docker-build:
	docker build -t $(IMAGE_NAME) .
	docker build -t $(IMAGE_NAME)-onbuild -f Dockerfile.onbuild .

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

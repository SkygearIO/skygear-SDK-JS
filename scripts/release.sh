#!/bin/sh

set -eu

if [ -z "$GIT_USER" ]; then
  >&2 echo "GIT_USER is required."
  exit 1
fi

if [ -z "$GIT_BRANCH" ]; then
  >&2 echo "GIT_BRANCH is required."
  exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
  >&2 echo "GITHUB_TOKEN is required."
  exit 1
fi

if [ -z "$SKYGEAR_VERSION" ]; then
  >&2 echo "SKYGEAR_VERSION is required."
  exit 1
fi

if [ -e "new-release" ]; then
  echo "Making github release and release commit..."
else
  >&2 echo "file 'new-release' is required."
  exit 1
fi

npm run clean
npm run set-version "$SKYGEAR_VERSION"
npm run format
npm run lint
npm run typecheck
npm run test
SKYGEAR_VERSION="$SKYGEAR_VERSION" npm run build

touch NEWCHANGELOG && cat new-release > NEWCHANGELOG && echo "" >> NEWCHANGELOG && cat CHANGELOG.md >> NEWCHANGELOG && mv NEWCHANGELOG CHANGELOG.md
git add lerna.json CHANGELOG.md 'packages/*/package.json'
git commit -m "Update CHANGELOG for v$SKYGEAR_VERSION"
git tag -a v"$SKYGEAR_VERSION" -m "Release v$SKYGEAR_VERSION"
git push git@github.com:SkygearIO/skygear-SDK-JS.git "$GIT_BRANCH"
git push git@github.com:SkygearIO/skygear-SDK-JS.git v"$SKYGEAR_VERSION"

github-release release -u skygeario -r skygear-SDK-JS --draft --tag v"$SKYGEAR_VERSION" --name v"$SKYGEAR_VERSION" --description "$(cat new-release)"

(cd packages/skygear-web && npm publish --access public)
(cd packages/skygear-node-client && npm publish --access public)
(cd packages/skygear-react-native && npm publish --access public)
(cd website && yarn && yarn run build && GIT_USER="$GIT_USER" USE_SSH=true yarn run publish-gh-pages)

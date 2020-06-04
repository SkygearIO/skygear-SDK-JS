#!/bin/sh

set -eu

if [ -z "$GIT_USER" ]; then
  echo >&2 "GIT_USER is required."
  exit 1
fi

if [ -z "$GIT_BRANCH" ]; then
  echo >&2 "GIT_BRANCH is required."
  exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo >&2 "GITHUB_TOKEN is required."
  exit 1
fi

if [ -z "$SKYGEAR_VERSION" ]; then
  echo >&2 "SKYGEAR_VERSION is required."
  exit 1
fi

if [ -e "new-release" ]; then
  echo "Making github release and release commit..."
else
  echo >&2 "file 'new-release' is required."
  exit 1
fi

npm run set-version "$SKYGEAR_VERSION"
npm run clean
npm run format
npm run lint
npm run typecheck
npm run test
SKYGEAR_VERSION="$SKYGEAR_VERSION" npm run build
(cd website && yarn)
(cd website && yarn run version "$SKYGEAR_VERSION")
(cd website && yarn run build)

touch NEWCHANGELOG && cat new-release >NEWCHANGELOG && echo "" >>NEWCHANGELOG && cat CHANGELOG.md >>NEWCHANGELOG && mv NEWCHANGELOG CHANGELOG.md
git add lerna.json CHANGELOG.md 'packages/*/package.json' 'packages/*/package-lock.json' 'website/'
git commit -m "Update CHANGELOG for v$SKYGEAR_VERSION"
git tag -a v"$SKYGEAR_VERSION" -s -m "Release v$SKYGEAR_VERSION"
git push git@github.com:SkygearIO/skygear-SDK-JS.git "$GIT_BRANCH"
git push git@github.com:SkygearIO/skygear-SDK-JS.git v"$SKYGEAR_VERSION"

github-release release -u skygeario -r skygear-SDK-JS --draft --tag v"$SKYGEAR_VERSION" --name v"$SKYGEAR_VERSION" --description "$(cat new-release)"
rm new-release

(cd packages/skygear-web && npm publish --access public)
(cd packages/skygear-react-native && npm publish --access public)
(cd website && GIT_USER="$GIT_USER" USE_SSH=true yarn run publish-gh-pages)

#!/bin/sh -e
if [ -z "$SKYGEAR_VERSION" ]; then
    >&2 echo "SKYGEAR_VERSION is required."
    exit 1
fi
if [ -z "$GITHUB_TOKEN" ]; then
    >&2 echo "GITHUB_TOKEN is required."
    exit 1
fi
if [ -z "$KEY_ID" ]; then
    >&2 echo "KEY_ID is required."
    exit 1
fi
if [ -e "new-release" ]; then
    echo "Making release commit and github release..."
else
    >&2 echo "file 'new-release' is required."
    exit 1
fi

github-release release -u skygeario -r skygear-SDK-JS --draft --tag v$SKYGEAR_VERSION --name "v$SKYGEAR_VERSION" --description "`cat new-release`"

## Update changelog
cat CHANGELOG.md >> new-release && mv new-release CHANGELOG.md
git add CHANGELOG.md

make update-version VERSION=$SKYGEAR_VERSION

npm run lerna bootstrap # make sure dependencies are linked
npm run prepublish # Build all packages
npm run lerna publish -- --skip-git --skip-npm --repo-version $SKYGEAR_VERSION
## Tag and push commit
git add CHANGELOG.md lerna.json gulp/context.js packages/*/package.json
git commit -m "Update CHANGELOG for $SKYGEAR_VERSION"

git tag -a v$SKYGEAR_VERSION -s -u $KEY_ID -m "Release v$SKYGEAR_VERSION"

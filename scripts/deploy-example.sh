# Get the private key from travis
openssl aes-256-cbc -K $encrypted_0afd650ed78c_key -iv $encrypted_0afd650ed78c_iv -in portal_rsa.enc -out /tmp/portal_rsa -d
chmod 600 /tmp/portal_rsa

# Put the example into /public_html
mkdir -p /tmp/example/public_html
cp -r example/ /tmp/example/public_html

cd /tmp/example
# Create git repos from example
git init
git add .
git commit -m 'Example'

# push to https://sdk-js-example.skygeario.com/
git remote add skygeario ssh://git@git.skygeario.com/sdkjsexample.git
export GIT_SSH_COMMAND="ssh -i /tmp/portal_rsa -o IdentitiesOnly=yes -F /dev/null"
git push skygeario master -f

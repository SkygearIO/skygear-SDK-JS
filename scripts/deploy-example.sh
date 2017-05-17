# Get the private key from travis
openssl aes-256-cbc -K $encrypted_0afd650ed78c_key -iv $encrypted_0afd650ed78c_iv -in portal_rsa.enc -out /tmp/portal_rsa -d
chmod 600 /tmp/portal_rsa
git config --global user.email "sdk-js@skygeario.com"
git config --global user.name "travis"
cat ssh_config >> ~/.ssh/config

# Put the example into /public_html
mkdir -p /tmp/example/public_html
cp -r example/ /tmp/example/public_html
cp -r ./packages/skygear/dist/ /tmp/example/public_html

cd /tmp/example
echo "import skygear" > __init__.py
# Create git repos from example
git init
git add .
git commit -m 'Example'

# Push to https://sdkjsexample.skygeario.com/static/index.html
git remote add skygeario ssh://git@git.skygeario.com/sdkjsexample.git
git push skygeario master -f

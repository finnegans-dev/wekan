FROM debian:buster-slim

# Declare Arguments
ARG NODE_VERSION
ARG METEOR_RELEASE
ARG METEOR_EDGE
ARG USE_EDGE
ARG NPM_VERSION
ARG FIBERS_VERSION
ARG ARCHITECTURE
ARG SRC_PATH
ARG WITH_API
ARG MATOMO_ADDRESS
ARG MATOMO_SITE_ID
ARG MATOMO_DO_NOT_TRACK
ARG MATOMO_WITH_USERNAME
ARG BROWSER_POLICY_ENABLED
ARG TRUSTED_URL
ARG WEBHOOKS_ATTRIBUTES
ARG OAUTH2_CLIENT_ID
ARG OAUTH2_SECRET
ARG OAUTH2_SERVER_URL
ARG OAUTH2_AUTH_ENDPOINT
ARG OAUTH2_USERINFO_ENDPOINT
ARG OAUTH2_TOKEN_ENDPOINT
ARG MONGO_URL
ARG ROOT_URL
ARG DEBIAN_FRONTEND


# Set the environment variables (defaults where required)
# DOES NOT WORK: paxctl fix for alpine linux: https://github.com/wekan/wekan/issues/1303
# ENV BUILD_DEPS="paxctl"
ENV BUILD_DEPS="apt-utils bsdtar gnupg gosu wget curl bzip2 build-essential python git ca-certificates gcc-7" \
    NODE_VERSION=v8.12.0 \
    METEOR_RELEASE=1.6.0.1 \
    USE_EDGE=false \
    METEOR_EDGE=1.5-beta.17 \
    NPM_VERSION=latest \
    FIBERS_VERSION=2.0.0 \
    ARCHITECTURE=linux-x64 \
    SRC_PATH=./ \
    WITH_API=true \
    MATOMO_ADDRESS="" \
    MATOMO_SITE_ID="" \
    MATOMO_DO_NOT_TRACK=true \
    MATOMO_WITH_USERNAME=false \
    BROWSER_POLICY_ENABLED=true \
    TRUSTED_URL="" \
    WEBHOOKS_ATTRIBUTES="" \
    OAUTH2_CLIENT_ID="" \
    OAUTH2_SECRET="" \
    OAUTH2_SERVER_URL="" \
    OAUTH2_AUTH_ENDPOINT="" \
    OAUTH2_USERINFO_ENDPOINT="" \
    OAUTH2_TOKEN_ENDPOINT="" \
    MONGO_URL=mongodb://wekanfinneg:asdasd123@ds223763.mlab.com:23763/testwekan \
    ROOT_URL=http://test.eco.finneg.com \
    DEBIAN_FRONTEND=noninteractive

RUN \
    mkdir -p /home/wekan/app && \
    # Add non-root user wekan
    useradd --user-group --system --home-dir /home/wekan wekan && \
    chown wekan: --recursive /home/wekan && \
    # OS dependencies
    apt-get update -y && apt-get install -y --no-install-recommends ${BUILD_DEPS} && \
    #sudo systemctl start nginx && \
    #sudo systemctl enable nginx  && \
    \
    # Meteor installer doesn't work with the default tar binary, so using bsdtar while installing.
    # https://github.com/coreos/bugs/issues/1095#issuecomment-350574389
    cp $(which tar) $(which tar)~ && \
    ln -sf $(which bsdtar) $(which tar) && \
    \
    # Download nodejs
    wget https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${ARCHITECTURE}.tar.gz && \
    wget https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt.asc && \
    #---------------------------------------------------------------------------------------------
    # Node Fibers 100% CPU usage issue:
    # https://github.com/wekan/wekan-mongodb/issues/2#issuecomment-381453161
    # https://github.com/meteor/meteor/issues/9796#issuecomment-381676326
    # https://github.com/sandstorm-io/sandstorm/blob/0f1fec013fe7208ed0fd97eb88b31b77e3c61f42/shell/server/00-startup.js#L99-L129
    # Also see beginning of wekan/server/authentication.js
    #   import Fiber from "fibers";
    #   Fiber.poolSize = 1e9;
    # OLD: Download node version 8.12.0 prerelease that has fix included, => Official 8.12.0 has been released
    # Description at https://releases.wekan.team/node.txt
    #wget https://releases.wekan.team/node-${NODE_VERSION}-${ARCHITECTURE}.tar.gz && \
    #echo "1ed54adb8497ad8967075a0b5d03dd5d0a502be43d4a4d84e5af489c613d7795  node-v8.12.0-linux-x64.tar.gz" >> SHASUMS256.txt.asc && \
    \
    # Verify nodejs authenticity
    grep ${NODE_VERSION}-${ARCHITECTURE}.tar.gz SHASUMS256.txt.asc | shasum -a 256 -c - && \
    #export GNUPGHOME="$(mktemp -d)" && \
    #\
    # Try other key servers if ha.pool.sks-keyservers.net is unreachable
    # Code from https://github.com/chorrell/docker-node/commit/2b673e17547c34f17f24553db02beefbac98d23c
    # gpg keys listed at https://github.com/nodejs/node#release-team
    # and keys listed here from previous version of this apt-getDockerfile
    #for key in \
    #9554F04D7259F04124DE6B476D5A82AC7E37093B \
    #94AE36675C464D64BAFA68DD7434390BDBE9B9C5 \
    #FD3A5288F042B6850C66B31F09FE44734EB7990E \
    #71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 \
    #DD8F2338BAE7501E3DD5AC78C273792F7D83545D \
    #C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
    #B9AE9905FFD7803F25714661B63B535A4C206CA9 \
    #; do \
    #gpg --keyserver ha.pool.sks-keyservers.net --recv-keys "$key" || \
    #gpg --keyserver pgp.mit.edu --recv-keys "$key" || \
    #gpg --keyserver keyserver.pgp.com --recv-keys "$key" ; \
    #done && \
    #gpg --verify SHASUMS256.txt.asc && \
    # Ignore socket files then delete files then delete directories
    #find "$GNUPGHOME" -type f | xargs rm -f && \
    #find "$GNUPGHOME" -type d | xargs rm -fR && \
    rm -f SHASUMS256.txt.asc && \
    \
    # Install Node
    tar xvzf node-${NODE_VERSION}-${ARCHITECTURE}.tar.gz && \
    rm node-${NODE_VERSION}-${ARCHITECTURE}.tar.gz && \
    mv node-${NODE_VERSION}-${ARCHITECTURE} /opt/nodejs && \
    ln -s /opt/nodejs/bin/node /usr/bin/node && \
    ln -s /opt/nodejs/bin/npm /usr/bin/npm && \
    \
    #DOES NOT WORK: paxctl fix for alpine linux: https://github.com/wekan/wekan/issues/1303
    #paxctl -mC `which node` && \
    \
    # Install Node dependencies
    npm install -g npm@${NPM_VERSION} && \
    npm install -g node-gyp && \
    npm install -g fibers@${FIBERS_VERSION} && \
    \
    # Change user to wekan and install meteor
    cd /home/wekan/ && \
    chown wekan:wekan --recursive /home/wekan && \
    curl "https://install.meteor.com/?release=${METEOR_RELEASE}" -o /home/wekan/install_meteor.sh && \
    # OLD: sed -i "s|RELEASE=.*|RELEASE=${METEOR_RELEASE}\"\"|g" ./install_meteor.sh && \
    # Install Meteor forcing its progress
    sed -i 's/VERBOSITY="--silent"/VERBOSITY="--progress-bar"/' ./install_meteor.sh && \
    echo "Starting meteor ${METEOR_RELEASE} installation...   \n" && \
    chown wekan:wekan /home/wekan/install_meteor.sh && \
    \
    # Check if opting for a release candidate instead of major release
    if [ "$USE_EDGE" = false ]; then \
      gosu wekan:wekan sh /home/wekan/install_meteor.sh; \
    else \
      gosu wekan:wekan git clone --recursive --depth 1 -b release/METEOR@${METEOR_EDGE} git://github.com/meteor/meteor.git /home/wekan/.meteor; \
    fi; \
    \
    # Get additional packages
    mkdir -p /home/wekan/app/packages && \
    chown wekan:wekan --recursive /home/wekan && \
    cd /home/wekan/app/packages && \
    gosu wekan:wekan git clone --depth 1 -b master git://github.com/wekan/flow-router.git kadira-flow-router && \
    gosu wekan:wekan git clone --depth 1 -b master git://github.com/meteor-useraccounts/core.git meteor-useraccounts-core && \
    gosu wekan:wekan git clone --depth 1 -b master git://github.com/wekan/meteor-accounts-cas.git meteor-accounts-cas && \
    sed -i 's/api\.versionsFrom/\/\/api.versionsFrom/' /home/wekan/app/packages/meteor-useraccounts-core/package.js && \
    cd /home/wekan/.meteor && \
    gosu wekan:wekan /home/wekan/.meteor/meteor -- help;


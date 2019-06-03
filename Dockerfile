FROM wekanteam/wekan:latest
LABEL maintainer="wekan"

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
    SRC_PATH=./build/bundle \
    WITH_API=true \
    MATOMO_ADDRESS="" \
    MATOMO_SITE_ID="" \
    MATOMO_DO_NOT_TRACK=true \
    MATOMO_WITH_USERNAME=false \
    BROWSER_POLICY_ENABLED=true \
    #TRUSTED_URL="https://go.finneg.com/" \
    #ECO_URL="https://go.finneg.com" \
    WEBHOOKS_ATTRIBUTES="" \
    OAUTH2_CLIENT_ID="" \
    OAUTH2_SECRET="" \
    OAUTH2_SERVER_URL="" \
    OAUTH2_AUTH_ENDPOINT="" \
    OAUTH2_USERINFO_ENDPOINT="" \
    OAUTH2_TOKEN_ENDPOINT="" \
    USE_CDN="true"
    #USE_CDN_URL="https://d3mccnbh54r0fh.cloudfront.net/wekan"
    #MONGO_URL=mongodb://wekanfinneg:asdasd123@ds223763.mlab.com:23763/testwekan \
    #MONGO_URL="mongodb://172.31.46.141:27017/wekan" \
    #CDN_URL="http://d3mccnbh54r0fh.cloudfront.net/wekan" \
    #ROOT_URL=https://go.finneg.com/wekan/

# Copy the app to the image
COPY ${SRC_PATH} /home/wekan/app

COPY ./traefik /home/wekan/app

COPY run.sh /home/wekan/app

#USER wekan

USER wekan

WORKDIR /home/wekan/app

RUN node main.js &

ENV PORT=3000
EXPOSE 9080 9081 3000

#RUN ls -all

#RUN ./traefik --configFile=conf.toml

CMD ["sh", "run.sh"]

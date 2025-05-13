#!/bin/bash -x
#
# Copyright (c) 2025, Oracle and/or its affiliates. All rights reserved.
#

set -o errexit
set -o nounset
set -o pipefail

# please update this variable when adding a new arguments
TOTAL_CMD_ARGS=2

if [[ $# -lt $TOTAL_CMD_ARGS ]]; then
    echo "usage:" >&2
    echo "  $0 --app-name <APP_NAME> --docker-tag <DOCKER_TAG>" >&2
    exit 1
fi

while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
    -t | --docker-tag)
        DOCKER_TAG="$2"
        shift # past argument
        shift # past value
        ;;
    -a | --app-name)
        APP_NAME="$2"
        shift # past argument
        shift # past value
        ;;
    esac
done

if [ -f "/etc/yum.repos.d/ol_artifacts.repo" ]; then
    cp /etc/yum.repos.d/ol_artifacts.repo ./
fi

declare -A plugins_map
plugins_map=(
  ["app-catalog"]="app-catalog-0.1.4"
)

PLUGINS_DIR="/tmp/headlamp-plugins"
mkdir -p $PLUGINS_DIR

for current_plugin in "${!plugins_map[@]}"; do
  git clone --depth 1 --branch ${plugins_map[$current_plugin]} https://github.com/headlamp-k8s/plugins.git
  cd plugins/$current_plugin
  npm install
  # Build the plugin
  npx @kinvolk/headlamp-plugin build .
  # Extract the built plugin files to a folder named build
  mkdir -p $PLUGINS_DIR/$current_plugin
  # TODO add THIRD_PARTY_LICENSES.txt for respective plugins
  npx @kinvolk/headlamp-plugin extract . $PLUGINS_DIR/$current_plugin/
done

podman build --pull=never --squash \
    --build-arg https_proxy=${https_proxy} \
    -t ${DOCKER_TAG} -f ./olm/builds/Dockerfile .

podman save -o ${APP_NAME}.tar ${DOCKER_TAG}

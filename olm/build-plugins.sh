#!/bin/bash -x
#
# Copyright (c) 2025, Oracle and/or its affiliates. All rights reserved.
#

set -o errexit
set -o nounset
set -o pipefail

# please update this variable when adding a new arguments
TOTAL_CMD_ARGS=1

if [[ $# -lt $TOTAL_CMD_ARGS ]]; then
    echo "usage:" >&2
    echo "  $0 --plugins-dir <PLUGINS_DIR>" >&2
    exit 1
fi

while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
    -b | --plugins-dir)
        PLUGINS_DIR="$2"
        shift # past argument
        shift # past value
        ;;
    esac
done

declare -A plugins_map
# map in the format 'plugin_name'='plugin_github_tag'
plugins_map=(
  ["app-catalog"]="app-catalog-0.6.1"
  ["prometheus"]="prometheus-0.6.0"
  ["cert-manager"]="cert-manager-0.1.0"
)

mkdir -p $PLUGINS_DIR
current_branch=$(git branch --show-current)

for current_plugin in "${!plugins_map[@]}"; do
  git fetch origin --tags
  # Build app-catalog from main branch which has cherry-picked commits of serviceproxy-app-catalog branch
  # TODO Remove this check after serviceproxy-app-catalog PR merged upstream
  if [[ "$current_plugin" != "app-catalog" ]];then
    git checkout ${plugins_map[$current_plugin]}
  else
    git checkout $current_branch
  fi

  pushd $current_plugin
  npm install
  # Build the plugin
  npx @kinvolk/headlamp-plugin build .
  # Extract the built plugin files to a folder named build
  mkdir -p $PLUGINS_DIR/$current_plugin
  # TODO add THIRD_PARTY_LICENSES.txt for corresponding plugins
  npx @kinvolk/headlamp-plugin extract . $PLUGINS_DIR/$current_plugin/
  popd
done

# Switch to Oracle's branch to build container image
git checkout $current_branch

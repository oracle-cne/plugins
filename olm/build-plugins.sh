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
# map in format 'plugin_name'='plugin_github_tag'
plugins_map=(
  ["app-catalog"]="app-catalog-0.1.4"
  ["prometheus"]="prometheus-0.5.0"
  ["plugin-catalog"]="plugin-catalog-0.3.1"
)

mkdir -p $PLUGINS_DIR

for current_plugin in "${!plugins_map[@]}"; do
  git clone --depth 1 --branch ${plugins_map[$current_plugin]} https://github.com/headlamp-k8s/plugins.git ${plugins_map[$current_plugin]}
  if [ -d ./buildrpm/$current_plugin ] && [ -f ./buildrpm/$current_plugin/patch.sh ]; then
    chmod +x ./buildrpm/$current_plugin/patch.sh
    ./buildrpm/$current_plugin/patch.sh ${plugins_map[$current_plugin]}
  fi
  pushd ${plugins_map[$current_plugin]}/$current_plugin
  npm install
  # Build the plugin
  npx @kinvolk/headlamp-plugin build .
  # Extract the built plugin files to a folder named build
  mkdir -p $PLUGINS_DIR/$current_plugin
  # TODO add THIRD_PARTY_LICENSES.txt for respective plugins
  npx @kinvolk/headlamp-plugin extract . $PLUGINS_DIR/$current_plugin/
  popd
  rm -rf ${plugins_map[$current_plugin]}
done



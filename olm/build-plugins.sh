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
# map in the format 'plugin_name'='plugin-oracle_release_branch'
plugins_map=(
  ["app-catalog"]="oracle/release/app-catalog-0.8.0"
  ["prometheus"]="oracle/release/prometheus-0.8.2"
  ["cert-manager"]="oracle/release/cert-manager-0.1.0"
  ["ai-assistant"]="oracle/release/ai-assistant-0.1.0"
)

cp ./buildrpm/*.patch /tmp/

mkdir -p $PLUGINS_DIR
current_branch=$(git name-rev --name-only HEAD)

for current_plugin in "${!plugins_map[@]}"; do

  git checkout -f ${plugins_map[$current_plugin]}
  pushd $current_plugin
  if [[ "$current_plugin" == "app-catalog" ]];then
    patch -p0 < /tmp/app-catalog-api-catalogs.patch
    patch -p0 < /tmp/app-catalog-helpers-catalog.patch
  fi
  npm install
  # Build the plugin
  npx @kinvolk/headlamp-plugin build .
  # Extract built plugin files to a folder named build
  mkdir -p $PLUGINS_DIR/$current_plugin
  npx @kinvolk/headlamp-plugin extract . $PLUGINS_DIR/$current_plugin/

  cp ../THIRD_PARTY_LICENSES.txt $PLUGINS_DIR/$current_plugin/THIRD_PARTY_LICENSES.txt
  popd
done

# Switch to orphan branch to build container image
git checkout -f $current_branch

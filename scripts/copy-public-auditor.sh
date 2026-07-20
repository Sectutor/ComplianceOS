#!/bin/bash
# Copy public-auditor static files into the build output directory
mkdir -p "$1/public-auditor"
cp -r public-auditor/. "$1/public-auditor/"
echo "Copied public-auditor to $1/public-auditor/"

#!/usr/bin/env bash
set -e  # exit immediately on error

# 2. Install project dependencies
npm install

# 3. Environment setup
cp -n .env.example .env || true

echo "Setup complete."

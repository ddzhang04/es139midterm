#!/bin/zsh -l
cd "$(dirname "$0")"
HISTORYLENS_UI_PREVIEW=1 npx expo start --go --port 8083 --ios

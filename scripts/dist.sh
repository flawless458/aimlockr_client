#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE="${1:-release}"
TARGET=x86_64-pc-windows-gnu

echo "==> cargo build --target $TARGET --profile $PROFILE"
cargo build --target "$TARGET" --profile "$PROFILE"

dll="$(find "target/$TARGET/$PROFILE/build" -path '*/webview2-com-sys-*/out/x64/WebView2Loader.dll' | head -1)"
if [ -n "$dll" ]; then
    cp -v "$dll" "target/$TARGET/$PROFILE/"
else
    echo "warning: WebView2Loader.dll not found in build output" >&2
fi

echo "done: target/$TARGET/$PROFILE/aimlockr_client.exe"

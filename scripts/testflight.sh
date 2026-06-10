#!/usr/bin/env bash
# Build StackDrill and upload to TestFlight.
#
# Authentication — set one of these in your environment (or a .env file):
#
#   API key (recommended):
#     ASC_API_KEY_ID       — Key ID from App Store Connect
#     ASC_API_KEY_ISSUER   — Issuer ID from App Store Connect
#     ASC_API_KEY_PATH     — Absolute path to the .p8 private key file
#
#   Apple ID (fallback):
#     APPLE_ID             — e.g. oscar@example.com
#     APP_SPECIFIC_PASSWORD — app-specific password from appleid.apple.com
#
# Usage:
#   bash scripts/testflight.sh
#   bash scripts/testflight.sh --skip-web   # skip npm build + ios-sync (Xcode only)

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
XCODE_PROJECT_DIR="$PROJECT_DIR/ios/App"
PROJECT="$XCODE_PROJECT_DIR/App.xcodeproj"
SCHEME="App"
ARCHIVE="$PROJECT_DIR/build/StackDrill.xcarchive"
EXPORT_DIR="$PROJECT_DIR/build/export"
EXPORT_PLIST="$PROJECT_DIR/build/ExportOptions.plist"
IPA="$EXPORT_DIR/StackDrill.ipa"

SKIP_WEB=false
for arg in "$@"; do
  [[ "$arg" == "--skip-web" ]] && SKIP_WEB=true
done

# Load .env if present
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a; source "$PROJECT_DIR/.env"; set +a
fi

# ── Auth ───────────────────────────────────────────────────────────────────
if [[ -n "${ASC_API_KEY_ID:-}" && -n "${ASC_API_KEY_ISSUER:-}" && -n "${ASC_API_KEY_PATH:-}" ]]; then
  USE_API_KEY=true
elif [[ -n "${APPLE_ID:-}" && -n "${APP_SPECIFIC_PASSWORD:-}" ]]; then
  USE_API_KEY=false
else
  echo "ERROR: no auth credentials found."
  echo "Set ASC_API_KEY_ID / ASC_API_KEY_ISSUER / ASC_API_KEY_PATH  (API key)"
  echo "  or  APPLE_ID / APP_SPECIFIC_PASSWORD  (Apple ID)"
  exit 1
fi

mkdir -p "$PROJECT_DIR/build" "$EXPORT_DIR"

# ── 1. Web build + iOS sync ────────────────────────────────────────────────
if [[ "$SKIP_WEB" == false ]]; then
  echo "==> npm run build"
  cd "$PROJECT_DIR" && npm run build

  echo "==> ios-sync"
  node "$PROJECT_DIR/scripts/ios-sync.mjs"
fi

# ── 2. Auto-increment build number ────────────────────────────────────────
cd "$XCODE_PROJECT_DIR"
CURRENT_BUILD=$(agvtool what-version -terse)
NEW_BUILD=$((CURRENT_BUILD + 1))
echo "==> build number: $CURRENT_BUILD → $NEW_BUILD"
agvtool new-version -all "$NEW_BUILD"
cd "$PROJECT_DIR"

# ── 3. Archive ─────────────────────────────────────────────────────────────
echo "==> xcodebuild archive"
ARCHIVE_FLAGS=(
  -project "$PROJECT"
  -scheme "$SCHEME"
  -configuration Release
  -archivePath "$ARCHIVE"
  -destination "generic/platform=iOS"
  -allowProvisioningUpdates
  CODE_SIGN_STYLE=Automatic
  DEVELOPMENT_TEAM=87F48SV42Q
)
if [[ "$USE_API_KEY" == true ]]; then
  ARCHIVE_FLAGS+=(
    -authenticationKeyID "$ASC_API_KEY_ID"
    -authenticationKeyIssuerID "$ASC_API_KEY_ISSUER"
    -authenticationKeyPath "$ASC_API_KEY_PATH"
  )
fi
xcodebuild archive "${ARCHIVE_FLAGS[@]}"
echo "Archive: $ARCHIVE"

# ── 4. Export IPA ──────────────────────────────────────────────────────────
cat > "$EXPORT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>export</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>87F48SV42Q</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
PLIST

EXPORT_FLAGS=(
  -exportArchive
  -archivePath "$ARCHIVE"
  -exportPath "$EXPORT_DIR"
  -exportOptionsPlist "$EXPORT_PLIST"
  -allowProvisioningUpdates
)
if [[ "$USE_API_KEY" == true ]]; then
  EXPORT_FLAGS+=(
    -authenticationKeyID "$ASC_API_KEY_ID"
    -authenticationKeyIssuerID "$ASC_API_KEY_ISSUER"
    -authenticationKeyPath "$ASC_API_KEY_PATH"
  )
fi
echo "==> xcodebuild -exportArchive"
xcodebuild "${EXPORT_FLAGS[@]}"

# Rename to StackDrill.ipa
EXPORTED=$(find "$EXPORT_DIR" -name "*.ipa" | head -1)
if [[ "$EXPORTED" != "$IPA" ]]; then
  mv "$EXPORTED" "$IPA"
fi
echo "IPA: $IPA"

# ── 5. Upload to TestFlight ────────────────────────────────────────────────
echo "==> uploading to App Store Connect (build $NEW_BUILD)"
if [[ "$USE_API_KEY" == true ]]; then
  xcrun altool --upload-app \
    --type ios \
    --file "$IPA" \
    --apiKey "$ASC_API_KEY_ID" \
    --apiIssuer "$ASC_API_KEY_ISSUER"
else
  xcrun altool --upload-app \
    --type ios \
    --file "$IPA" \
    --username "$APPLE_ID" \
    --password "$APP_SPECIFIC_PASSWORD"
fi

echo ""
echo "Done. Build $NEW_BUILD submitted to TestFlight."
echo "Check App Store Connect -> TestFlight for processing status."

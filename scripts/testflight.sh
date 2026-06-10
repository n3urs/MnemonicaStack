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
PROJECT="$PROJECT_DIR/ios/App/App.xcodeproj"
SCHEME="App"
BUNDLE_ID="com.oscarsullivan.mnemonica"
ARCHIVE="$PROJECT_DIR/build/StackDrill.xcarchive"
EXPORT_DIR="$PROJECT_DIR/build/export"
EXPORT_PLIST="$PROJECT_DIR/build/ExportOptions.plist"

SKIP_WEB=false
for arg in "$@"; do
  [[ "$arg" == "--skip-web" ]] && SKIP_WEB=true
done

# Load .env if present
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a; source "$PROJECT_DIR/.env"; set +a
fi

mkdir -p "$PROJECT_DIR/build"

# ── 1. Web build + iOS sync ────────────────────────────────────────────────
if [[ "$SKIP_WEB" == false ]]; then
  echo "==> npm run build"
  cd "$PROJECT_DIR" && npm run build

  echo "==> ios-sync"
  node "$PROJECT_DIR/scripts/ios-sync.mjs"
fi

# ── 2. Archive ─────────────────────────────────────────────────────────────
echo "==> xcodebuild archive"
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE" \
  -destination "generic/platform=iOS" \
  -allowProvisioningUpdates \
  -authenticationKeyID "$ASC_API_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_API_KEY_ISSUER" \
  -authenticationKeyPath "$ASC_API_KEY_PATH" \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=87F48SV42Q

echo "Archive: $ARCHIVE"

# ── 3. Export IPA ──────────────────────────────────────────────────────────
cat > "$EXPORT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>upload</string>
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

echo "==> xcodebuild -exportArchive (upload to App Store Connect)"

# Build the auth flags
AUTH_FLAGS=()
if [[ -n "${ASC_API_KEY_ID:-}" && -n "${ASC_API_KEY_ISSUER:-}" && -n "${ASC_API_KEY_PATH:-}" ]]; then
  echo "    using API key auth (key $ASC_API_KEY_ID)"
  AUTH_FLAGS=(
    -authenticationKeyID "$ASC_API_KEY_ID"
    -authenticationKeyIssuerID "$ASC_API_KEY_ISSUER"
    -authenticationKeyPath "$ASC_API_KEY_PATH"
  )
elif [[ -n "${APPLE_ID:-}" && -n "${APP_SPECIFIC_PASSWORD:-}" ]]; then
  echo "    using Apple ID auth ($APPLE_ID)"
  # altool-style creds go via xcrun after export; export without upload here,
  # then upload separately below.
  AUTH_FLAGS=()
  UPLOAD_VIA_ALTOOL=true
else
  echo "ERROR: no auth credentials found."
  echo "Set ASC_API_KEY_ID / ASC_API_KEY_ISSUER / ASC_API_KEY_PATH  (API key)"
  echo "  or  APPLE_ID / APP_SPECIFIC_PASSWORD  (Apple ID)"
  exit 1
fi

if [[ "${UPLOAD_VIA_ALTOOL:-false}" == true ]]; then
  # Export to disk, then upload via altool
  cat > "$EXPORT_PLIST" <<PLIST2
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
  <key>stripSwiftSymbols</key>
  <true/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
PLIST2

  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE" \
    -exportPath "$EXPORT_DIR" \
    -exportOptionsPlist "$EXPORT_PLIST"

  IPA=$(find "$EXPORT_DIR" -name "*.ipa" | head -1)
  # Rename to StackDrill.ipa regardless of what Xcode named it
  if [[ "$(basename "$IPA")" != "StackDrill.ipa" ]]; then
    mv "$IPA" "$(dirname "$IPA")/StackDrill.ipa"
    IPA="$(dirname "$IPA")/StackDrill.ipa"
  fi
  echo "==> uploading via altool: $IPA"
  xcrun altool --upload-app \
    --type ios \
    --file "$IPA" \
    --username "$APPLE_ID" \
    --password "$APP_SPECIFIC_PASSWORD"
else
  # API key: xcodebuild can upload directly
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE" \
    -exportPath "$EXPORT_DIR" \
    -exportOptionsPlist "$EXPORT_PLIST" \
    -allowProvisioningUpdates \
    "${AUTH_FLAGS[@]}"

  # Rename IPA to StackDrill.ipa if Xcode used a different name
  IPA=$(find "$EXPORT_DIR" -name "*.ipa" | head -1)
  if [[ -n "$IPA" && "$(basename "$IPA")" != "StackDrill.ipa" ]]; then
    mv "$IPA" "$(dirname "$IPA")/StackDrill.ipa"
  fi
fi

echo ""
echo "Done. Build submitted to TestFlight."
echo "Check App Store Connect -> TestFlight for processing status."

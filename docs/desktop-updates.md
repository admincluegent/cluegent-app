# Normal desktop updates

Packaged apps check three seconds after launch. macOS GitHub builds download in the background. Windows Store builds query Microsoft Store and silently stage Store packages. A non-blocking **Restart to update** notice appears once ready. Nothing automatically restarts; restarting is rejected while a meeting/listening session is active. Windows direct NSIS builds continue to use electron-updater, not Store packages.

## macOS release requirements

The existing `v1.0.7` release has only ZIP assets, without `latest-mac.yml`. That release cannot serve electron-updater checks. Existing clients using the old manual-download implementation must install a release containing the new updater once; subsequent releases can update automatically.

1. Increment `package.json` and lockfile version together.
2. Build with `npm run app:build` on macOS with the configured Developer ID certificate and notarization keychain profile (`APPLE_KEYCHAIN_PROFILE`, default `cluegent-notary`). Do not disable signing or notarization for releases. Ad-hoc-signed builds cannot use Squirrel.Mac updates.
3. Upload the generated `latest-mac.yml`, both architecture ZIPs, and their generated blockmaps (if present) to the same public GitHub release in `admincluegent/cluegent-app`. Upload DMGs as manual installers too. Preserve generated metadata exactly; it contains asset names and SHA-512 checksums. Do not hand-create a ZIP or rename it after building.
4. Publish only once all assets are uploaded. Keep the stable `latest` channel. Test an installed older signed build on both Apple Silicon and Intel, checking download and restart. A development checkout intentionally does not check updates.

## Windows Store

Build with `npm run app:build:store` so the updated Rust native module is included. Upload the higher-version APPX package to the existing Partner Center identity. Do not publish Store updates through GitHub.

The native worker uses `StoreContext` with the Electron window handle, first querying packages and calling `TrySilentDownloadStorePackageUpdatesAsync`. The restart action calls `TrySilentDownloadAndInstallStorePackageUpdatesAsync` and relaunches only after success. Store operations run outside the main thread.

Silent updates require Windows 10 version 1803 or newer, Store auto-updates enabled, and a non-metered network. If Store policy prevents silent downloading, or an older native binary lacks the bridge, show **Open Microsoft Store** instead. An offline/error check never blocks app startup. Validate this flow with two Store-signed package versions using a Partner Center flight; a sideloaded APPX without a Store listing cannot verify Store update delivery.

## Local verification

Platform requirements: [electron-builder auto-update](https://www.electron.build/auto-update.html) and [Microsoft Store package updates](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/package-updates-from-store).

`node --test scripts/test-updates.cjs` checks launch/download/restart behavior, active-session protection, development suppression, and Store fallback. Run `npm run typecheck:electron` and `npx tsc --noEmit` for IPC/renderer types. Windows native compilation and real Store delivery must also be validated on Windows before release.

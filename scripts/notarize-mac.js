const path = require('path');
const { notarize } = require('@electron/notarize');

exports.default = async function notarizeMac(context) {
    if (process.platform !== 'darwin' || context.electronPlatformName !== 'darwin') {
        return;
    }

    if (process.env.SKIP_NOTARIZE === '1') {
        console.log('[Notarize] SKIP_NOTARIZE=1; skipping automatic notarization.');
        return;
    }

    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(context.appOutDir, `${appName}.app`);
    const keychainProfile = process.env.APPLE_KEYCHAIN_PROFILE || 'cluegent-notary';

    console.log(`[Notarize] Submitting ${appPath} using keychain profile "${keychainProfile}"...`);

    await notarize({
        appBundleId: context.packager.appInfo.appId,
        appPath,
        keychainProfile,
    });

    console.log('[Notarize] Notarization completed.');
};

// FR-25: Android 10+ offers "Keep app data" when uninstalling, so a reinstall with the same
// package name and signing key finds everything (ARCHITECTURE §4.4). iOS has no equivalent.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withKeepAppData(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (application) application.$['android:hasFragileUserData'] = 'true';
    return mod;
  });
};

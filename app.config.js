export default function appConfig({config}) {
  const extra = {...config.extra, healthkit: false, launchScope: 'training-nutrition'};
  if (process.env.BREAKWIND_IOS_DISTRIBUTION !== 'testflight') return {...config, extra};

  const bundleIdentifier = process.env.BREAKWIND_IOS_BUNDLE_ID?.trim();
  const buildNumber = process.env.BREAKWIND_IOS_BUILD_NUMBER?.trim();
  const appleTeamId = process.env.BREAKWIND_APPLE_TEAM_ID?.trim();
  if (!bundleIdentifier || !/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(bundleIdentifier)) {
    throw new Error('Set BREAKWIND_IOS_BUNDLE_ID to the explicit identifier registered to your Apple team.');
  }
  if (!buildNumber || !/^\d+(?:\.\d+){0,2}$/.test(buildNumber)) {
    throw new Error('Set BREAKWIND_IOS_BUILD_NUMBER to an unused numeric build number for this version.');
  }
  if (!appleTeamId || !/^[A-Z0-9]{10}$/.test(appleTeamId)) {
    throw new Error('Set BREAKWIND_APPLE_TEAM_ID to your 10-character Apple Developer Team ID.');
  }
  return {...config, extra, ios: {...config.ios, bundleIdentifier, buildNumber, appleTeamId}};
}

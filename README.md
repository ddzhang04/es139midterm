# HistoryLens

A native iOS and Android prototype built with React Native, Expo SDK 57, and Viro 2.57.3. It explores historical sites through red object/person markers, blue structure markers, information cards, narration, a site map, and historical layers. The bundled Battery Point content and imagery illustrate a fictional site.

## Run the app

```sh
npm install
npm run start:native
```

The development build connects to Metro. On a local connection, the phone and Mac need network access to each other and HistoryLens needs Local Network permission. A JavaScript reload updates app code; it cannot update native modules or the installed build number.

For an iPhone prototype that opens without a development server:

```sh
npm run build:ios:preview
```

Install the resulting internal-distribution build on the registered iPhone. The DEV button shows its installed native build number. Signing requires an Apple Developer membership and device registration. Install the new app over the existing one to retain its local records.

To create a development build with the native camera, AR engine, and location module:

```sh
npm run build:ios
# Or: npm run build:android
```

Expo Go can run camera and screen-marker demonstrations, but it does not contain the native Viro AR engine. Native surface AR requires an ARKit-compatible iPhone or an ARCore-compatible Android device.

## UI preview on a Mac

```sh
npm run build:ios:simulator
```

The simulator profile produces a standalone `.app` using `HISTORYLENS_UI_PREVIEW=1`. It omits the hardware AR engine and starts the interactive demo without camera permission or Metro. Install the returned app on a booted simulator:

```sh
xcrun simctl install booted /path/to/HistoryLens.app
xcrun simctl launch booted com.historylens.prototype
```

This workstation has Xcode 16 and the iOS 18.0 simulator runtime. EAS uses its newer build environment to compile the SDK 57 app. Simulator previews are for UI checks; camera tracking and global placement need a physical phone.

## AR and saved locations

**Surface demo:** move slowly across a well-lit, textured ground, tabletop, or wall, tap a highlighted plane, then tap the flat marker to open its information card. The tile follows the detected surface. Use Place marker again to reposition it.

**Harvard test:** open DEV and use the phone's current location to create a local test spot. Its name does not establish that the phone is on campus. A precise, fresh GPS reading within the 50-metre discovery radius unlocks its saved marker. Once unlocked, GPS drift and walking do not hide it within the AR session.

Show marker in front of me creates a preview two metres ahead once tracking is ready. It works without GPS and leaves existing saved coordinates untouched. Save global position requires a fresh GPS reading and persists latitude, longitude, usable WGS84 altitude, rotation, scale, and location accuracy. If height is unavailable, restoration uses camera height. Saved markers include direction/distance guidance, and repositioning restores their layer and nonzero opacity.

The iPhone global scene uses ARKit GravityAndHeading and maps nearby coordinates to east/up/south axes once per session. Native tracking then keeps the point fixed as the visitor walks. GPS and compass error affect placement; this is approximate positioning rather than precise geospatial localization. Future 3D models still need better alignment.

Moving or removing a test spot deliberately clears its local placement. Global mode does not use cloud anchors. Legacy cloud-anchor helpers remain in the surface implementation but are not used by the Harvard flow. All saved progress, bookmarks, and test locations are currently phone-local; shared site records require a backend.

## Code structure

- `App.tsx`: font loading and the safe-area provider.
- `src/HistoryLens.tsx`: screen navigation and exploration coordination.
- `src/screens/`: welcome, site overview, site map, and application panels.
- `src/components/`: historical layer controls.
- `src/screens/StoryInfoScreen.tsx`: marker information, narration, and sources. Opening a story keeps the underlying AR session mounted so returning preserves its placement.
- `src/ui/`: shared controls, theme colors, and styles.
- `src/useCameraSession.ts`: camera permission and foreground/session lifecycle.
- `src/useNarration.ts`: narration state and stale-callback protection.
- `src/useExplorationProgress.ts`: validated progress hydration and persistence.
- `src/localStorage.ts`: ordered per-record reads, writes, and deletions across hook remounts.
- `src/useTestLocation.ts`: location tracking and test-spot transactions.
- `src/GlobalARScene.tsx`, `src/SurfaceARScene.tsx`: native AR scenes.
- `src/SurfaceARView.tsx`: lazy native-engine loading and capability checks.
- `src/content.ts`, `src/assets.ts`, `src/icons.ts`: content and bundled visual resources.

Storage retains the existing record keys. Progress loading merges visits made before hydration finishes, and an explicit bookmark change takes precedence over the restored value. Writes are serialized so a later save or delete cannot be undone by an older asynchronous write. Moving a test spot blocks saves for the old position. Camera permission responses and narration callbacks are ignored after their operation has been superseded. AR mount guards support React's effect replay.

## Checks and formatting

```sh
npm run check
npm run bundle
npm run format
```

`check` runs TypeScript, the test suite, and Prettier. Tests cover navigation, narration, camera ownership, location permissions, marker visibility, saved placement, storage ordering, hydration races, and narrow/large-text layouts. `bundle` exports the native iOS and Android JavaScript/Hermes bundles; it does not produce a signed IPA or APK.

Native builds have compiled on EAS. The simulator has rendered the demo UI. Physical-device AR accuracy and restart restoration still require device testing.

## Provider configuration

Local provider settings belong in ignored `.env` files, with the same configuration in the EAS development environment when building. See `.env.example`. Phone profiles can configure ReactVision through `HISTORYLENS_RV_API_KEY` and `HISTORYLENS_RV_PROJECT_ID`; simulator previews omit that provider. Do not commit credentials.

The dependency audit still reports upstream advisories in the Expo/Viro and development-tool dependency trees. The compatible `http-cache-semantics` update has been applied. Do not use `npm audit fix --force` to switch SDK or Jest major versions without checking Expo/Viro compatibility.

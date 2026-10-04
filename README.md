# HistoryLens

A native iOS and Android prototype built with React Native, Expo SDK 57, and Viro 2.57.3. It explores historical sites through red object/person markers, blue structure markers, information cards, narration, a site map, and historical layers. The sample experience uses location-neutral illustrative stories and an interactive native story map. It makes no claims about a particular historical site.

## Interactive map

The Story Map uses `react-native-maps` 1.27.2, with Apple Maps on iOS. Pan and zoom, tap the saved AR pin, or use the location control to recenter. Pins use saved global AR coordinates when available. Built-in approximate pins mark the Harvard Science Center and Quincy House courtyard; tapping either shows its location card and walking directions. The Harvard overview control shows both campus locations even if your saved AR marker is elsewhere. Demo stories without coordinates are not shown as real locations. Location permission does not create a saved story.

Test the map through `npm run start:ui` in Expo Go without using a cloud build. Older HistoryLens AR binaries do not contain this new native module: they display an upgrade message rather than crashing. Rebuild the iOS development app once to use the map and AR together. Subsequent map UI changes reload through Metro. Android development builds require a Google Maps API key before map testing outside Expo Go.

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

## Local iPhone builds (no EAS cloud build)

The local toolchain check reads the minimum Xcode version enforced by the installed React Native package (currently 16.1). It does not force an upgrade to Expo’s documented supported Xcode version (26.4+). Older toolchains may encounter additional compiler or SDK issues; diagnose an actual build failure before requiring further upgrades. Choose an Xcode version compatible with this Mac’s macOS and open Xcode once to finish setup. See [Apple's Xcode requirements](https://developer.apple.com/xcode/system-requirements/) and [Expo's SDK support matrix](https://docs.expo.dev/versions/latest/).

Check the installed tools and run locally:

```sh
brew install cocoapods
npm run doctor:ios
npm run ios:local
```

Connect the iPhone by USB, unlock it, trust the Mac, and enable Developer Mode. Choose the physical iPhone when prompted. The command compiles a development app on this Mac and installs it on the phone; it does not invoke EAS Build or consume its cloud build allowance. Signing may require adding your Apple account and development team in Xcode. See [Expo local development](https://docs.expo.dev/guides/local-app-overview/).

Keep Metro running while testing. After the first local installation, UI and JavaScript AR interaction changes reload through `npm run start:native`; native dependency/configuration changes need another local build. The existing `build:ios`, `build:ios:preview`, and `build:ios:simulator` commands use EAS cloud builds.

## UI preview without a native build

```sh
npm run start:ui
```

Open the preview in Expo Go on a phone or press `i` for the iPhone simulator. It uses a neutral demo scene and screen markers, skips camera/AR startup, and reloads UI changes through Metro. Port 8083 keeps it separate from the AR development server on 8081. This command does not create a cloud build. To test the actual world-space red box, use the existing HistoryLens development app and `npm run start:native`.

A standalone simulator artifact can optionally be created with the cloud command below; use the Expo Go preview for everyday UI iteration:

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

**Saved location test:** open DEV and use the phone's current location to create a local test spot. Its name does not establish that the phone is on campus. A precise, fresh GPS reading within the 50-metre discovery radius unlocks its saved marker. Once unlocked, GPS drift and walking do not hide it within the AR session.

Show marker in front of me creates a preview two metres ahead once tracking is ready. It works without GPS and leaves existing saved coordinates untouched. Save global position requires a fresh GPS reading and persists latitude, longitude, usable WGS84 altitude, rotation, scale, and location accuracy. If height is unavailable, restoration uses camera height. Saved markers include direction/distance guidance, and repositioning restores their layer and nonzero opacity.

The iPhone global scene uses ARKit GravityAndHeading and maps nearby coordinates to east/up/south axes once per session. Native tracking then keeps the point fixed as the visitor walks. GPS and compass error affect placement; this is approximate positioning rather than precise geospatial localization. Future 3D models still need better alignment.

Moving or removing a test spot deliberately clears its local placement. Global mode does not use cloud anchors. Legacy cloud-anchor helpers remain in the surface implementation but are not used by the saved-location flow. All saved progress, bookmarks, and test locations are currently phone-local; shared site records require a backend.

## Code structure

- `App.tsx`: font loading and the safe-area provider.
- `src/HistoryLens.tsx`: screen navigation and exploration coordination.
- `src/screens/`: welcome, site overview, site map, and application panels.
- `src/components/`: historical layers, demo story cards, and the world-space AR information panel. Tapping a native marker opens a camera-facing panel at the marker with paged story text, narration, and a close button.
- `src/ui/`: shared controls, theme colors, and styles.
- `src/useCameraSession.ts`: camera permission and foreground/session lifecycle.
- `src/useNarration.ts`: narration state and stale-callback protection.
- `src/useExplorationProgress.ts`: validated progress hydration and persistence.
- `src/localStorage.ts`: ordered per-record reads, writes, and deletions across hook remounts.
- `src/useTestLocation.ts`: location tracking and test-spot transactions.
- `src/GlobalARScene.tsx`, `src/SurfaceARScene.tsx`: native AR scenes.
- `src/SurfaceARView.tsx`: lazy native-engine loading and capability checks.
- `src/content.ts`, `src/icons.ts`, `src/components/PlaceIllustration.tsx`: reusable example content, icons, and location-neutral illustrations.

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

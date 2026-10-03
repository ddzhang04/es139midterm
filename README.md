# HistoryLens

A native iOS and Android prototype built with React Native and Expo. The UI follows the provided Figma design and demo, using the original local imagery, icons, Inter typography, and cream/green/amber palette.

## Run surface AR on your phone

Actual surface AR requires a HistoryLens development build, because Expo Go does not include the native Viro AR engine. The project uses Expo SDK 57 and Viro 2.57.3.

```sh
npm install
npm run build:ios
# Or: npm run build:android
npm run start:native
```

EAS will guide you through project setup and signing. A cloud build for a physical iPhone requires an Apple Developer membership and device registration. Install the resulting development app, then open its development-server QR link. Android requires an ARCore-compatible device; iPhone requires ARKit support.

For a standalone iPhone prototype, run `npm run build:ios:preview` and install the internal-distribution build. It includes its JavaScript bundle, so it opens without Metro or a development-server tunnel. Both native build profiles use the EAS development environment for provider configuration.

Move slowly across a well-lit textured ground, tabletop, or wall. Tap a highlighted surface to place a 32 × 24 cm flat red tile, then tap it to show a rectangular information card above the anchor. The card faces the camera; the tile follows the detected surface. Use **Place marker again** to reposition. Content selection switches between red object/person tiles and blue structure tiles.

For the camera and screen-marker fallback in Expo Go:

```sh
npx expo start --go
```

## Prototype flows

- **Explore This Site** opens live camera exploration directly and requests camera permission when needed. Going back opens the site overview; **Start AR Experience** resumes camera exploration.
- Red object/person blocks and blue structure blocks expand into information cards when tapped.
- Reconstruct, Compare, and Discover modes; a native slider fades historical blocks over the current scene.
- Layer switches show/hide structures, people, military equipment, photos, and personal stories.
- Interactive site map, visit progress, and saved site bookmark. Progress and bookmarks persist on device.
- Story narration uses native text-to-speech. Exploration uses the rear camera by default, including entry from the site map. If access is denied, the app offers Settings or the demo scene; **Use demo scene** is available while exploring.
- Indigenous lands panel and source context preserve the design’s fictional-content acknowledgment.

The development build uses native ARKit/ARCore plane anchors. Expo Go and demo mode use screen-positioned markers. Placement is manual: site recognition, realistic 3D models, GPS navigation, and verified historical content are future work. The map is an interactive illustration of the fictional site.

## Verify

```sh
npm run typecheck
npm test
npm run bundle
```

Tests cover navigation, block expansion, narration, saved progress, mode switching, comparison opacity, layers, map selections, and camera switching. Export verifies the native iOS and Android JavaScript/Hermes bundles; it does not create a signed IPA or APK. Native compilation and physical-device AR verification are still needed because this workstation has no installed iOS simulator runtime.

Main implementation: `App.tsx`. Fictional site content and stop definitions: `src/content.ts`. Figma icons are preserved as SVG XML in `src/icons.ts`; image assets are bundled locally under `assets/`.

Native tooling on this workstation is currently Xcode 16 without CocoaPods or an iOS simulator runtime, so native compilation is unverified. Expo Doctor also reports the direct `@expo/config-plugins` dependency: Viro 2.57.3 imports that package and requires it at the project root for prebuild.

## Harvard current-location test

Tap the corner **DEV** button, open **Developer Settings**, and choose **Use my current location**, allow foreground location access with Precise Location, then explore. The phone saves its actual GPS coordinates as **Harvard test spot** (it does not infer your phone location from the Mac or assert that you are on campus). A 50-metre radius unlocks a single red test tile. Uncertain, stale, or denied location readings keep a new exploration session locked. Once the spot is unlocked, walking away or GPS drift does not hide the placed tile during that AR session; location tracking stops outside the AR screen or when the app backgrounds. Saved coordinates are local to that phone. **Move test spot to my location** in Dev Settings deliberately replaces the test spot; movement alone never changes the saved coordinates. **Remove test spot** removes its local record.

Adding expo-location requires rebuilding the installed development app: run `npm run build:ios`, install its new build, then connect to `npm run start:native`. A JavaScript reload alone cannot add the native location module.

Persistent exact-position anchors are enabled when a provider is configured in the native build and local Metro environment. Create a ReactVision project, set `HISTORYLENS_RV_API_KEY` and `HISTORYLENS_RV_PROJECT_ID` in both the local `.env` used by Metro and the EAS build environment (see `.env.example`), and rebuild. With that provider enabled, select a surface, slowly scan its surroundings, and choose **Save exact AR position**. Hosting sends the visual anchor to ReactVision. The phone stores the returned anchor ID plus the surface-local tap offset for a 24-hour test; returning nearby and scanning the same environment resolves that anchor. Saved identifiers are currently phone-local, so sharing with other visitors also needs a shared site database. Provider failures offer manual repositioning and do not claim persistence. Provider credentials stay outside Git. Cloud hosting/resolution has passed mocked tests; a physical-device restart/restore test is still required.

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Animated,
  BackHandler,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import useNarration from './useNarration';
import useCameraSession from './useCameraSession';
import useExplorationProgress from './useExplorationProgress';
import useObjectCollection from './useObjectCollection';
import ObjectCollection from './components/ObjectCollection';
import LandmarkPhotoScan from './screens/LandmarkPhotoScan';
import Slider from '@react-native-community/slider';
import ResponsiveAROverlay from './ResponsiveAROverlay';
import { LayerId, StopId, harvardTestStop, treeDemoStory, stops } from './content';
import useTestLocation from './useTestLocation';
import SurfaceARView, {
  supportsSurfaceAR,
  surfaceInstructions,
  SurfacePhase,
} from './SurfaceARView';
import PlaceIllustration from './components/PlaceIllustration';
import { Button, Header, Icon, RoundButton, Tag } from './ui/primitives';
import { styles as s } from './ui/styles';
import { colors as C } from './ui/theme';
import WelcomeScreen from './screens/WelcomeScreen';
import SiteMapScreen from './screens/SiteMapScreen';
import AppPanel, { type Panel } from './screens/AppPanel';
import HistoricalLayers from './components/HistoricalLayers';
import StoryCard from './components/StoryCard';
import StoryReader from './screens/StoryReader';
import { campusPlaces, campusSpot, campusStory, type CampusPlace } from './mapPlaces';
import { proximity } from './testLocation';
const uiPreview = Constants.expoConfig?.extra?.uiPreview === true;
type Screen = 'welcome' | 'map' | 'ar';
type Mode = 'scan' | 'reconstruct' | 'compare' | 'discover';

export default function HistoryLens() {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [arSize, setARSize] = useState<{ width: number; height: number } | null>(null);
  const [screen, setScreen] = useState<Screen>('welcome');
  const [mapFrom, setMapFrom] = useState<Screen>('welcome');
  const [arFrom, setARFrom] = useState<'welcome' | 'map'>('welcome');
  const [mode, setMode] = useState<Mode>('scan');
  const [selected, setSelected] = useState<StopId | null>(null);
  const [storyPage, setStoryPage] = useState(0);
  const [fullScreenStory, setFullScreenStory] = useState(false);
  const collection = useObjectCollection();
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [photoScan, setPhotoScan] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  useEffect(() => {
    if (!selected || screen !== 'ar') setFullScreenStory(false);
  }, [selected, screen]);
  const { visited, visit, error: progressError } = useExplorationProgress();
  const [panel, setPanel] = useState<Panel>(null);
  const [layerPanel, setLayerPanel] = useState(false);
  const [enabled, setEnabled] = useState<Record<LayerId, boolean>>({
    structures: true,
    people: true,
    equipment: true,
    photos: false,
    stories: true,
  });
  const [past, setPast] = useState(58);
  const {
    camera,
    permission,
    foreground,
    enableCamera: requestCamera,
    disableCamera,
  } = useCameraSession(uiPreview, screen === 'ar');
  const [surfacePhase, setSurfacePhase] = useState<SurfacePhase>('scanning');
  const [placementRevision, setPlacementRevision] = useState(0);
  const [unlockedSpot, setUnlockedSpot] = useState<number | null>(null);
  const [anchorSaveRequest, setAnchorSaveRequest] = useState(0);
  const [anchorRestoreRequest, setAnchorRestoreRequest] = useState(0);
  const [anchorError, setAnchorError] = useState('');
  const [markerGuide, setMarkerGuide] = useState<string | null>(null);
  const [previewSpot, setPreviewSpot] = useState<number | null>(null);
  const geo = useTestLocation((screen === 'ar' || screen === 'map') && foreground);
  const [demoTree, setDemoTree] = useState(false);
  const [campusTarget, setCampusTarget] = useState<CampusPlace | null>(null);
  const [placementStop, setPlacementStop] = useState<StopId>('gun');
  const {
    speaking,
    error: narrationError,
    stop: stopNarration,
    toggle: toggleNarration,
  } = useNarration(screen === 'ar' && foreground);
  const grow = useRef(new Animated.Value(1)).current;
  const targetSpot = demoTree ? null : campusTarget ? campusSpot(campusTarget) : geo.spot;
  const targetStory = demoTree
    ? treeDemoStory
    : campusTarget
      ? campusStory(campusTarget)
      : geo.spot
        ? harvardTestStop
        : null;
  const nearby =
    targetSpot && geo.fix
      ? proximity(
          {
            ...targetSpot,
            latitude: targetSpot.placement?.latitude ?? targetSpot.latitude,
            longitude: targetSpot.placement?.longitude ?? targetSpot.longitude,
          },
          geo.fix,
        )
      : null;
  const detail =
    targetStory?.id === selected
      ? targetStory
      : campusPlaces.some((place) => place.id === selected)
        ? campusStory(campusPlaces.find((place) => place.id === selected)!)
        : stops.find((stop) => stop.id === selected);
  const locationUnlocked =
    !targetSpot ||
    nearby?.state === 'nearby' ||
    (screen === 'ar' &&
      (unlockedSpot === targetSpot.savedAt || previewSpot === targetSpot.savedAt));
  useEffect(() => {
    if (screen !== 'ar') {
      setUnlockedSpot(null);
      setPreviewSpot(null);
    } else if (targetSpot && nearby?.state === 'nearby') setUnlockedSpot(targetSpot.savedAt);
  }, [screen, targetSpot?.savedAt, nearby?.state, surfacePhase]);
  const nativeAR = camera && !!permission?.granted && supportsSurfaceAR && foreground;
  const placedStop = targetStory || stops.find((stop) => stop.id === placementStop)!;
  const markerLayerVisible =
    enabled[placedStop.layer] && (placedStop.id !== 'keeper' || enabled.stories);
  const markerOpacity = mode === 'compare' ? past / 100 : 1;
  function showMarker() {
    if (campusTarget) return;
    dismissStory();
    setEnabled((current) => ({
      ...current,
      [placedStop.layer]: true,
      ...(placedStop.id === 'keeper' ? { stories: true } : {}),
    }));
    if (geo.spot && !demoTree) setPlacementStop('gun');
    if (mode === 'compare' && past === 0) setPast(100);
    setPlacementRevision((value) => value + 1);
  }
  function dismissStory() {
    setSelected(null);
    stopNarration();
  }
  const arHeight = arSize?.height || height - insets.top - insets.bottom;
  const stackActions = width < 360 || fontScale >= 1.4;
  const markerWidth = Math.min(144, (width - 48) / (stackActions ? 1 : 2));

  const back = () => {
    stopNarration();
    if (collectionOpen) return setCollectionOpen(false);
    if (photoScan) return setPhotoScan(false);
    if (fullScreenStory) return setFullScreenStory(false);
    if (panel) return setPanel(null);
    if (layerPanel) return setLayerPanel(false);
    if (selected) return setSelected(null);
    if (screen === 'ar') {
      disableCamera();
      setScreen(arFrom);
    } else if (screen === 'map') setScreen(mapFrom);
    else setScreen('welcome');
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'welcome' && !panel) return false;
      back();
      return true;
    });
    return () => subscription.remove();
  }, [
    screen,
    selected,
    panel,
    layerPanel,
    mapFrom,
    arFrom,
    fullScreenStory,
    collectionOpen,
    photoScan,
  ]);
  useEffect(() => {
    if (selected) {
      grow.setValue(1);
      Animated.spring(grow, { toValue: 1.04, useNativeDriver: true, friction: 5 }).start();
    }
  }, [selected]);
  function openStop(id: StopId) {
    setScanMessage('');
    Haptics.selectionAsync().catch(() => {});
    stopNarration();
    setLayerPanel(false);
    setStoryPage(0);
    setSelected(id);
    visit(id);
  }
  function openMap() {
    setMapFrom(screen);
    setSelected(null);
    stopNarration();
    setScreen('map');
  }
  function changeLayer(id: LayerId, value: boolean) {
    setEnabled((current) => ({ ...current, [id]: value }));
    if (detail?.layer === id || (detail?.id === 'keeper' && id === 'stories')) dismissStory();
  }
  function changeMode(next: Mode) {
    stopNarration();
    setSelected(null);
    setLayerPanel(false);
    setMode(next);
    Haptics.selectionAsync().catch(() => {});
  }
  async function enableCamera() {
    setPlacementRevision(0);
    setSurfacePhase('scanning');
    await requestCamera();
  }
  function toggleCamera() {
    if (uiPreview) {
      setPanel('help');
      return;
    }
    if (camera) disableCamera();
    else void enableCamera();
  }
  function listen() {
    if (detail) toggleNarration(detail.story);
  }
  const enterAR = () => {
    setARFrom('welcome');
    setDemoTree(false);
    setCampusTarget(null);
    setPlacementStop((id) => (stops.some((stop) => stop.id === id) ? id : 'gun'));
    setPlacementRevision(0);
    setSelected(null);
    setMode('scan');
    setScreen('ar');
    if (!uiPreview) void geo.requestLocation();
    void enableCamera();
  };

  function exploreFromMap() {
    setARFrom('map');
    setDemoTree(false);
    setCampusTarget(null);
    const id = geo.spot
      ? 'gun'
      : detail?.id || stops.find((stop) => !visited.includes(stop.id))?.id || 'gun';
    setPlacementStop(id);
    setScreen('ar');
    setMode(id === 'keeper' ? 'discover' : 'reconstruct');
    if (!uiPreview) void geo.requestLocation();
    void enableCamera();
    // Campus AR has separate geotagged dots, not the old sample marker.
    // Selecting that sample here hides all campus dots without opening a card.
    if (supportsSurfaceAR && !uiPreview) setSelected(null);
    else openStop(id);
  }

  function exploreCampus(place: CampusPlace) {
    setARFrom('map');
    setDemoTree(false);
    setCampusTarget(place);
    setSelected(null);
    setLayerPanel(false);
    setPlacementRevision(0);
    setPlacementStop(place.id);
    setMode('reconstruct');
    setScreen('ar');
    void geo.requestLocation();
    void enableCamera();
  }

  function placeDemoTree() {
    dismissStory();
    setCampusTarget(null);
    setDemoTree(true);
    setPlacementStop('demo-tree');
    setPlacementRevision((value) => value + 1);
    setMode('reconstruct');
    setLayerPanel(false);
    setEnabled((current) => ({ ...current, structures: true }));
    void enableCamera();
  }

  const devControl = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open developer settings"
      onPress={() => setPanel('dev')}
      style={s.devButton}
    >
      <Text
        style={s.devButtonText}
      >{`DEV${Constants.nativeBuildVersion ? ` ${Constants.nativeBuildVersion}` : ''}`}</Text>
    </Pressable>
  );
  const locationControls = (
    <View style={{ backgroundColor: C.cream, padding: 12, borderRadius: 14, gap: 7 }}>
      <Text style={s.eyebrow}>SAVED LOCATION · TEST MODE</Text>
      <Text accessibilityLiveRegion="polite" style={s.smallBody}>
        {geo.busy
          ? 'Getting your phone’s location…'
          : geo.error ||
            (geo.spot
              ? geo.nearby?.state === 'nearby'
                ? 'You’re near your saved test spot. Open AR to place your floating marker.'
                : geo.nearby?.state === 'far'
                  ? `${Math.round(geo.nearby.distance)} m away · return within 50 m to unlock your tile.`
                  : 'Checking your location. Precise GPS is needed to unlock the tile.'
              : 'Save where you’re standing as a test location.')}
      </Text>
      <Button
        compact
        title={
          geo.busy
            ? 'Getting location…'
            : geo.spot
              ? 'Move test spot to my location'
              : 'Use my current location'
        }
        onPress={() => {
          if (!geo.busy) {
            dismissStory();
            setPlacementStop('gun');
            void geo.useCurrentLocation().then(() => setPlacementRevision(0));
          }
        }}
      />
      {geo.spot && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            dismissStory();
            void geo.clear();
          }}
        >
          <Text style={s.textLink}>Remove test spot</Text>
        </Pressable>
      )}
      {geo.spot && (
        <Text style={s.note}>Moving this test spot clears its saved global placement.</Text>
      )}
      {geo.spot && (
        <Text style={s.note}>
          {geo.spot.placement
            ? 'Global marker position saved on this phone.'
            : 'GPS spot saved. Open AR, place a floating marker, then save its global position.'}
        </Text>
      )}
    </View>
  );

  if (photoScan)
    return (
      <LandmarkPhotoScan
        fix={geo.fix}
        foreground={foreground}
        onCancel={() => setPhotoScan(false)}
        onCollect={(place) => {
          collection.collect(place.id);
          setPhotoScan(false);
          openStop(place.id);
          setScanMessage(`Collected: ${place.title}`);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }}
      />
    );

  return (
    <View
      style={[
        s.app,
        {
          paddingTop: screen === 'welcome' ? 0 : insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: screen === 'ar' ? '#09110E' : C.cream,
        },
      ]}
    >
      <StatusBar barStyle={screen === 'ar' ? 'light-content' : 'dark-content'} />
      {screen === 'welcome' && (
        <WelcomeScreen
          height={height}
          fontScale={fontScale}
          insets={insets}
          developer={devControl}
          onExplore={enterAR}
          onOpenMap={openMap}
          onOpenCollection={() => setCollectionOpen(true)}
          collectionCount={collection.ids.length}
        />
      )}
      {screen === 'map' && (
        <SiteMapScreen
          width={width}
          spot={geo.spot}
          fix={geo.fix}
          locationError={geo.error}
          visited={visited}
          detail={detail}
          developer={devControl}
          onBack={back}
          onSelect={(id) => setSelected(id)}
          onExplore={exploreFromMap}
          onExplorePlace={exploreCampus}
          onRequestLocation={() => void geo.requestLocation()}
          onAddLocation={() => setPanel('dev')}
        />
      )}
      {screen === 'ar' && (
        <View
          style={s.ar}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setARSize((previous) =>
              previous?.width === width && previous?.height === height
                ? previous
                : { width, height },
            );
          }}
        >
          {nativeAR ? (
            <SurfaceARView
              key={demoTree ? 'tree-demo' : 'site-ar'}
              demoTree={demoTree}
              campusMarkers={!demoTree}
              campusMarkersVisible={enabled.structures}
              selectedStopId={selected}
              storyPage={storyPage}
              onStoryPageChange={setStoryPage}
              onMarkerGuide={setMarkerGuide}
              locationFix={geo.fix}
              onPlacementSaved={campusTarget || demoTree ? undefined : geo.savePlacement}
              story={targetStory || undefined}
              fixedLocation={!!campusTarget}
              testSpot={targetSpot}
              saveRequest={anchorSaveRequest}
              restoreRequest={anchorRestoreRequest}
              onAnchorError={setAnchorError}
              onAnchorSaved={campusTarget || demoTree ? undefined : geo.saveAnchor}
              stopId={targetStory?.id || placementStop}
              speaking={speaking}
              onListen={listen}
              onExpand={() => setFullScreenStory(true)}
              selected={selected === (targetStory?.id || placementStop)}
              visible={locationUnlocked && markerLayerVisible}
              opacity={markerOpacity}
              revision={campusTarget ? 0 : placementRevision}
              onSelect={openStop}
              onDismiss={dismissStory}
              onPhaseChange={(phase) => {
                if (phase === 'globalPlaced' && !campusTarget && !demoTree)
                  setPreviewSpot(geo.spot?.savedAt ?? null);
                if (phase === 'globalRestored') setPreviewSpot(null);
                setSurfacePhase(phase);
                if (phase !== 'anchorError') setAnchorError('');
              }}
            />
          ) : camera && permission?.granted && foreground ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onMountError={() => {
                disableCamera();
                Alert.alert('Camera unavailable', 'The demo scene is ready to explore.');
              }}
            />
          ) : (
            <PlaceIllustration dark />
          )}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(9,17,14,.6)', 'transparent', 'transparent', 'rgba(9,17,14,.9)']}
            locations={[0, 0.24, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
          <ResponsiveAROverlay
            height={arHeight}
            top={
              <>
                <Header
                  developer={devControl}
                  dark
                  title={
                    targetSpot
                      ? 'Explore in AR'
                      : selected
                        ? detail?.id === 'keeper'
                          ? 'Explore in AR'
                          : 'Explore Object'
                        : mode === 'compare'
                          ? 'Compare'
                          : mode === 'discover'
                            ? 'Historical Layers'
                            : 'Explore in AR'
                  }
                  back={back}
                  action={
                    mode === 'scan' ? (
                      <RoundButton
                        icon="info"
                        label="How to explore"
                        dark
                        onPress={() => setPanel('help')}
                      />
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Choose historical layers"
                        style={s.layersButton}
                        onPress={() => setLayerPanel(!layerPanel)}
                      >
                        <Icon name="layers" />
                        {!stackActions && <Text style={s.layersLabel}>Layers</Text>}
                      </Pressable>
                    )
                  }
                />
                <View style={s.arHint} pointerEvents="none">
                  {nativeAR ? (
                    <View style={s.hintCard}>
                      <Text accessibilityLiveRegion="polite" style={s.hintText}>
                        {narrationError ||
                          (selected && scanMessage) ||
                          (campusTarget && !locationUnlocked
                            ? `Go within 200 m of ${campusTarget.title} with a precise GPS reading to see its AR circle.`
                            : demoTree && !selected
                              ? '3D tree placed in front of you. Move around it or tap it for details.'
                              : selected
                                ? demoTree
                                  ? 'Tree window open beside the tree. Tap × to close.'
                                  : 'Card pinned where you opened it. Tap × to close.'
                                : !markerLayerVisible
                                  ? campusTarget
                                    ? 'Marker hidden by Layers. Enable Structures to show it.'
                                    : 'Marker hidden by Layers. Tap Show marker in front of me to show it.'
                                  : markerOpacity === 0
                                    ? 'Marker hidden by the comparison slider. Increase Past or reposition it to show it.'
                                    : surfacePhase === 'anchorError'
                                      ? anchorError || surfaceInstructions.anchorError
                                      : !demoTree &&
                                          (!geo.spot || campusTarget) &&
                                          surfacePhase === 'globalRestored'
                                        ? 'Look around for nearby story dots. Each dot marks its own location.'
                                        : [
                                              'saving',
                                              'resolving',
                                              'aligning',
                                              'saved',
                                              'restored',
                                              'globalWaiting',
                                              'globalPlaced',
                                              'globalSaved',
                                              'globalRestored',
                                            ].includes(surfacePhase)
                                          ? surfaceInstructions[surfacePhase]
                                          : geo.spot && !locationUnlocked
                                            ? 'Return near your saved spot with a precise location reading to unlock the tile.'
                                            : surfaceInstructions[surfacePhase])}
                        {!selected && markerGuide ? `\n${markerGuide}` : ''}
                      </Text>
                    </View>
                  ) : mode === 'compare' ? (
                    <Tag amber>PAST OVERLAY: {Math.round(past)}%</Tag>
                  ) : (
                    <View style={s.hintCard}>
                      <Icon name="footsteps" />
                      <Text style={s.hintText}>
                        {campusTarget && !locationUnlocked
                          ? `Go within 200 m of ${campusTarget.title} with a precise GPS reading to see its AR circle.`
                          : selected
                            ? 'Tap another circle to keep exploring.'
                            : 'Tap a red or blue circle to discover its story.'}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            }
            scene={
              <ScrollView
                testID="ar-scene-content"
                style={{ flex: 1 }}
                contentContainerStyle={[
                  s.sceneContent,
                  layerPanel && { alignContent: 'flex-start' },
                ]}
                bounces={false}
                pointerEvents={nativeAR && !layerPanel ? 'none' : 'auto'}
              >
                {!nativeAR &&
                  !layerPanel &&
                  locationUnlocked &&
                  (targetStory ? [targetStory] : stops)
                    .filter((stop) =>
                      targetStory
                        ? true
                        : mode === 'scan'
                          ? stop.id !== 'keeper'
                          : mode === 'reconstruct'
                            ? stop.id === 'gun' || stop.id === 'quarters'
                            : mode === 'discover'
                              ? enabled[stop.layer] && (stop.id !== 'keeper' || enabled.stories)
                              : enabled[stop.layer],
                    )
                    .map((stop) => (
                      <Animated.View
                        key={stop.id}
                        style={[
                          s.blockAnchor,
                          {
                            width: markerWidth,
                            transform: [{ scale: selected === stop.id ? grow : 1 }],
                            opacity: mode === 'compare' ? past / 100 : 1,
                          },
                        ]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Explore ${stop.title}`}
                          accessibilityState={{ expanded: selected === stop.id }}
                          onPress={() => openStop(stop.id)}
                          style={[
                            s.arBlock,
                            { backgroundColor: stop.color },
                            demoTree && {
                              backgroundColor: 'transparent',
                              width: 120,
                              height: 150,
                              borderRadius: 0,
                            },
                            selected === stop.id && s.selectedBlock,
                          ]}
                        >
                          {demoTree ? (
                            <Image
                              source={require('../assets/demos/doodle-tree.png')}
                              style={{ width: 120, height: 150 }}
                              resizeMode="contain"
                            />
                          ) : (
                            <Text style={s.blockPlus}>{selected === stop.id ? '−' : '+'}</Text>
                          )}
                        </Pressable>
                        <Text style={s.blockLabel}>{stop.title}</Text>
                      </Animated.View>
                    ))}
                {!nativeAR &&
                  !layerPanel &&
                  !geo.spot &&
                  !campusTarget &&
                  mode === 'discover' &&
                  enabled.photos && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Explore archival photograph"
                      onPress={() => {
                        openStop('signal');
                        setPanel('sources');
                      }}
                      style={[s.archiveBlock, { width: markerWidth }]}
                    >
                      <Icon name="photos" />
                      <Text style={s.blockLabel}>Archival photograph</Text>
                    </Pressable>
                  )}
                {layerPanel && (
                  <HistoricalLayers
                    enabled={enabled}
                    onClose={() => setLayerPanel(false)}
                    onChange={changeLayer}
                  />
                )}
              </ScrollView>
            }
            footer={
              nativeAR && selected && !layerPanel ? null : (
                <>
                  {nativeAR && !selected && !layerPanel && (
                    <View style={{ gap: 8, marginBottom: 12 }}>
                      <Button
                        compact
                        dark
                        secondary
                        title="Scan objects"
                        icon="scan"
                        onPress={() => {
                          stopNarration();
                          setPhotoScan(true);
                        }}
                      />
                    </View>
                  )}
                  {
                    <>
                      {nativeAR &&
                        !campusTarget &&
                        !demoTree &&
                        geo.spot?.placement &&
                        surfacePhase === 'anchorError' && (
                          <Button
                            compact
                            title="Retry saved position"
                            onPress={() => {
                              setPlacementRevision(0);
                              setAnchorRestoreRequest((value) => value + 1);
                            }}
                          />
                        )}
                      {nativeAR &&
                        !campusTarget &&
                        !demoTree &&
                        geo.spot &&
                        (surfacePhase === 'globalPlaced' || surfacePhase === 'anchorError') && (
                          <Button
                            compact
                            title="Save global position"
                            onPress={() => setAnchorSaveRequest((value) => value + 1)}
                          />
                        )}
                      {nativeAR &&
                        !selected &&
                        !layerPanel &&
                        demoTree &&
                        (!campusTarget || locationUnlocked) && (
                          <View style={{ gap: 10, marginBottom: 12 }}>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={{ gap: 8 }}
                            >
                              {(targetStory ? [targetStory] : stops).map((stop) => (
                                <Pressable
                                  key={stop.id}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Open AR information for ${stop.title}`}
                                  accessibilityState={{ selected: placementStop === stop.id }}
                                  onPress={() => {
                                    setPlacementStop(stop.id);
                                    openStop(stop.id);
                                  }}
                                  style={[
                                    s.tag,
                                    {
                                      minHeight: 44,
                                      backgroundColor:
                                        placementStop === stop.id ? stop.color : C.cream,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      s.tagText,
                                      { color: placementStop === stop.id ? 'white' : C.green },
                                    ]}
                                  >
                                    {stop.title}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                            {!campusTarget && !demoTree && (
                              <Button
                                compact
                                title={
                                  demoTree
                                    ? 'Place tree again'
                                    : geo.spot
                                      ? 'Show marker in front of me'
                                      : 'Place marker again'
                                }
                                dark
                                secondary
                                onPress={showMarker}
                              />
                            )}
                          </View>
                        )}
                      {camera && !supportsSurfaceAR && (
                        <Text
                          style={{
                            color: 'white',
                            textAlign: 'center',
                            fontSize: 12,
                            marginBottom: 8,
                          }}
                        >
                          Surface AR needs the HistoryLens development build. Expo Go shows screen
                          markers.
                        </Text>
                      )}
                      {detail && !layerPanel && !nativeAR ? (
                        <StoryCard
                          detail={detail}
                          speaking={speaking}
                          stackActions={stackActions}
                          onClose={dismissStory}
                          onListen={listen}
                          onExpand={() => setFullScreenStory(true)}
                          onSources={() => setPanel('sources')}
                        />
                      ) : mode === 'compare' ? (
                        <View style={s.comparison}>
                          <Text style={s.comparisonTitle}>Move the slider to reveal the past.</Text>
                          <View
                            style={[
                              s.sliderRow,
                              stackActions && {
                                flexDirection: 'column',
                                borderRadius: 14,
                                paddingVertical: 8,
                              },
                            ]}
                          >
                            <Text style={s.sliderLabel}>Past</Text>
                            <Slider
                              accessibilityLabel="Historical overlay opacity"
                              accessibilityValue={{ min: 0, max: 100, now: Math.round(past) }}
                              style={
                                stackActions
                                  ? { width: '100%', height: 44 }
                                  : { flex: 1, height: 44 }
                              }
                              minimumValue={0}
                              maximumValue={100}
                              value={past}
                              onValueChange={setPast}
                              minimumTrackTintColor={C.green}
                              maximumTrackTintColor={C.line}
                              thumbTintColor={C.green}
                            />
                            <Text style={s.sliderLabel}>Present</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={s.arStatus}>
                          <View style={s.liveDot} />
                          <Text style={s.liveText}>
                            {demoTree
                              ? 'Tree demo'
                              : campusTarget
                                ? campusTarget.title
                                : geo.spot
                                  ? 'Saved location'
                                  : nativeAR
                                    ? 'Nearby stories'
                                    : camera
                                      ? 'Live camera'
                                      : 'Explore stories'}{' '}
                            ·{' '}
                            {targetStory
                              ? visited.includes(targetStory.id)
                                ? 1
                                : 0
                              : visited.filter((id) => stops.some((stop) => stop.id === id)).length}
                            /{targetStory ? 1 : stops.length} stories explored
                          </Text>
                        </View>
                      )}
                      {mode === 'scan' && !selected ? (
                        <View style={s.scanControls}>
                          <RoundButton
                            icon="mapLight"
                            label="Open site map"
                            dark
                            onPress={openMap}
                          />
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Scan site and reconstruct"
                            onPress={() => changeMode('reconstruct')}
                            style={s.scanButton}
                          >
                            <View style={s.scanInner} />
                          </Pressable>
                          <RoundButton
                            icon="volume"
                            label="Audio information"
                            dark
                            onPress={() => setPanel('help')}
                          />
                        </View>
                      ) : (
                        <View style={s.modes}>
                          {(
                            [
                              { id: 'reconstruct', icon: 'reconstruct', title: 'Reconstruct' },
                              { id: 'compare', icon: 'compare', title: 'Compare' },
                              { id: 'discover', icon: 'discover', title: 'Discover' },
                            ] as const
                          ).map((item) => (
                            <Pressable
                              key={item.id}
                              accessibilityRole="tab"
                              accessibilityState={{ selected: mode === item.id }}
                              onPress={() => changeMode(item.id)}
                              style={[s.mode, mode === item.id && s.modeSelected]}
                            >
                              <Icon name={item.icon} />
                              <Text
                                style={[
                                  s.modeText,
                                  mode === item.id && {
                                    color: C.green,
                                    fontFamily: 'Inter_700Bold',
                                  },
                                ]}
                              >
                                {item.title}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      <View style={s.arTools}>
                        <Pressable accessibilityRole="button" onPress={toggleCamera}>
                          <Text style={s.toolText}>
                            {uiPreview
                              ? 'UI preview · demo scene'
                              : camera
                                ? 'Use demo scene'
                                : 'Use live camera'}
                          </Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={openMap}>
                          <Text style={s.toolText}>Site map ↗</Text>
                        </Pressable>
                      </View>
                    </>
                  }
                </>
              )
            }
          />
        </View>
      )}
      {collectionOpen && (
        <ObjectCollection
          ids={collection.ids}
          error={collection.error}
          onClose={() => setCollectionOpen(false)}
        />
      )}
      <AppPanel
        panel={panel}
        height={height}
        insets={insets}
        detail={detail}
        geo={geo}
        nativeAR={nativeAR}
        locationControls={locationControls}
        anchorError={anchorError}
        progressError={progressError}
        onClose={() => setPanel(null)}
        demoTree={demoTree}
        onPlaceTree={() => {
          if (screen !== 'ar') setARFrom(screen === 'map' ? 'map' : 'welcome');
          setScreen('ar');
          if (demoTree) showMarker();
          else placeDemoTree();
          setPanel(null);
        }}
        onReturnToMarkers={() => {
          enterAR();
          setPanel(null);
        }}
        onReposition={() => {
          showMarker();
          setPanel(null);
        }}
      />
      {fullScreenStory && detail && (
        <StoryReader
          detail={detail}
          speaking={speaking}
          onListen={listen}
          onClose={() => setFullScreenStory(false)}
        />
      )}
    </View>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import Slider from '@react-native-community/slider';
import ResponsiveAROverlay from './ResponsiveAROverlay';
import { LayerId, StopId, harvardTestStop, stops } from './content';
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
import SiteOverviewScreen from './screens/SiteOverviewScreen';
import SiteMapScreen from './screens/SiteMapScreen';
import AppPanel, { type Panel } from './screens/AppPanel';
import HistoricalLayers from './components/HistoricalLayers';
import StoryCard from './components/StoryCard';
import StoryReader from './screens/StoryReader';
const uiPreview = Constants.expoConfig?.extra?.uiPreview === true;
type Screen = 'welcome' | 'site' | 'map' | 'ar';
type Mode = 'scan' | 'reconstruct' | 'compare' | 'discover';

export default function HistoryLens() {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [arSize, setARSize] = useState<{ width: number; height: number } | null>(null);
  const [screen, setScreen] = useState<Screen>('welcome');
  const [mapFrom, setMapFrom] = useState<Screen>('welcome');
  const [mode, setMode] = useState<Mode>('scan');
  const [selected, setSelected] = useState<StopId | null>(null);
  const [fullScreenStory, setFullScreenStory] = useState(false);
  useEffect(() => {
    if (!selected || screen !== 'ar') setFullScreenStory(false);
  }, [selected, screen]);
  const { visited, saved, visit, toggleSaved, error: progressError } = useExplorationProgress();
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
  const geo = useTestLocation(screen === 'ar' && foreground);
  const [placementStop, setPlacementStop] = useState<StopId>('gun');
  const {
    speaking,
    stop: stopNarration,
    toggle: toggleNarration,
  } = useNarration(screen === 'ar' && foreground);
  const grow = useRef(new Animated.Value(1)).current;
  const detail =
    geo.spot && selected === 'gun' ? harvardTestStop : stops.find((stop) => stop.id === selected);
  // Once a nearby spot unlocks in this exploration session, GPS drift or
  // walking away must not remove an already placed world-space marker.
  const locationUnlocked =
    !geo.spot ||
    geo.allowed ||
    (screen === 'ar' && (unlockedSpot === geo.spot.savedAt || previewSpot === geo.spot.savedAt));
  useEffect(() => {
    if (screen !== 'ar') {
      setUnlockedSpot(null);
      setPreviewSpot(null);
    } else if (geo.spot && geo.nearby?.state === 'nearby') setUnlockedSpot(geo.spot.savedAt);
  }, [screen, geo.spot?.savedAt, geo.nearby?.state, surfacePhase]);
  const nativeAR = camera && !!permission?.granted && supportsSurfaceAR && foreground;
  const placedStop = geo.spot ? harvardTestStop : stops.find((stop) => stop.id === placementStop)!;
  const markerLayerVisible =
    enabled[placedStop.layer] && (placedStop.id !== 'keeper' || enabled.stories);
  const markerOpacity = mode === 'compare' ? past / 100 : 1;
  function showMarker() {
    dismissStory();
    setEnabled((current) => ({
      ...current,
      [placedStop.layer]: true,
      ...(placedStop.id === 'keeper' ? { stories: true } : {}),
    }));
    if (geo.spot) setPlacementStop('gun');
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
    if (fullScreenStory) return setFullScreenStory(false);
    if (panel) return setPanel(null);
    if (layerPanel) return setLayerPanel(false);
    if (selected) return setSelected(null);
    if (screen === 'ar') {
      disableCamera();
      setScreen('site');
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
  }, [screen, selected, panel, layerPanel, mapFrom, fullScreenStory]);
  useEffect(() => {
    if (selected) {
      grow.setValue(1);
      Animated.spring(grow, { toValue: 1.04, useNativeDriver: true, friction: 5 }).start();
    }
  }, [selected]);
  function openStop(id: StopId) {
    Haptics.selectionAsync().catch(() => {});
    stopNarration();
    setLayerPanel(false);
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
    setPlacementRevision(0);
    setSelected(null);
    setMode('scan');
    setScreen('ar');
    void enableCamera();
  };

  function toggleBookmark() {
    toggleSaved();
    Haptics.selectionAsync().catch(() => {});
  }
  function exploreFromMap() {
    const id = detail?.id || stops.find((stop) => !visited.includes(stop.id))?.id || 'gun';
    setPlacementStop(id);
    setScreen('ar');
    setMode(detail?.id === 'keeper' ? 'discover' : 'reconstruct');
    void enableCamera();
    if (!detail) openStop(id);
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
      <StatusBar
        barStyle={screen === 'ar' || screen === 'welcome' ? 'light-content' : 'dark-content'}
      />
      {screen === 'welcome' && (
        <WelcomeScreen
          height={height}
          fontScale={fontScale}
          insets={insets}
          developer={devControl}
          onExplore={enterAR}
          onOpenMap={openMap}
        />
      )}
      {screen === 'site' && (
        <SiteOverviewScreen
          height={height}
          insets={insets}
          saved={saved}
          developer={devControl}
          onBack={back}
          onToggleSaved={toggleBookmark}
          onViewLand={() => setPanel('land')}
          onExplore={enterAR}
        />
      )}
      {screen === 'map' && (
        <SiteMapScreen
          width={width}
          visited={visited}
          detail={detail}
          developer={devControl}
          onBack={back}
          onSelect={openStop}
          onExplore={exploreFromMap}
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
              onMarkerGuide={setMarkerGuide}
              locationFix={geo.fix}
              onPlacementSaved={geo.savePlacement}
              testSpot={geo.spot}
              saveRequest={anchorSaveRequest}
              restoreRequest={anchorRestoreRequest}
              onAnchorError={setAnchorError}
              onAnchorSaved={geo.saveAnchor}
              stopId={geo.spot ? 'gun' : placementStop}
              speaking={speaking}
              onListen={listen}
              onExpand={() => setFullScreenStory(true)}
              selected={selected === (geo.spot ? 'gun' : placementStop)}
              visible={locationUnlocked && markerLayerVisible}
              opacity={markerOpacity}
              revision={placementRevision}
              onSelect={openStop}
              onDismiss={dismissStory}
              onPhaseChange={(phase) => {
                if (phase === 'globalPlaced') setPreviewSpot(geo.spot?.savedAt ?? null);
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
                    geo.spot
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
                <View style={s.arHint}>
                  {nativeAR ? (
                    <View style={s.hintCard}>
                      <Text accessibilityLiveRegion="polite" style={s.hintText}>
                        {selected
                          ? 'Card pinned where you opened it. Tap × to close.'
                          : !markerLayerVisible
                            ? 'Marker hidden by Layers. Tap Show marker in front of me to show it.'
                            : markerOpacity === 0
                              ? 'Marker hidden by the comparison slider. Increase Past or reposition it to show it.'
                              : surfacePhase === 'anchorError'
                                ? anchorError || surfaceInstructions.anchorError
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
                                    : surfaceInstructions[surfacePhase]}
                        {!selected && geo.spot && markerGuide ? `\n${markerGuide}` : ''}
                      </Text>
                    </View>
                  ) : mode === 'compare' ? (
                    <Tag amber>PAST OVERLAY: {Math.round(past)}%</Tag>
                  ) : (
                    <View style={s.hintCard}>
                      <Icon name="footsteps" />
                      <Text style={s.hintText}>
                        {selected
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
                  stops
                    .filter((stop) =>
                      geo.spot
                        ? stop.id === 'gun'
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
                          accessibilityLabel={`Explore ${geo.spot ? harvardTestStop.title : stop.title}`}
                          accessibilityState={{ expanded: selected === stop.id }}
                          onPress={() => openStop(stop.id)}
                          style={[
                            s.arBlock,
                            { backgroundColor: stop.color },
                            selected === stop.id && s.selectedBlock,
                          ]}
                        >
                          <Text style={s.blockPlus}>{selected === stop.id ? '−' : '+'}</Text>
                        </Pressable>
                        <Text style={s.blockLabel}>
                          {geo.spot ? harvardTestStop.title : stop.title}
                        </Text>
                      </Animated.View>
                    ))}
                {!nativeAR && !layerPanel && !geo.spot && mode === 'discover' && enabled.photos && (
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
              <>
                {nativeAR && geo.spot?.placement && surfacePhase === 'anchorError' && (
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
                  geo.spot &&
                  (surfacePhase === 'globalPlaced' || surfacePhase === 'anchorError') && (
                    <Button
                      compact
                      title="Save global position"
                      onPress={() => setAnchorSaveRequest((value) => value + 1)}
                    />
                  )}
                {nativeAR && !selected && !layerPanel && (
                  <View style={{ gap: 10, marginBottom: 12 }}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {(geo.spot ? [harvardTestStop] : stops).map((stop) => (
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
                              backgroundColor: placementStop === stop.id ? stop.color : C.cream,
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
                    <Button
                      compact
                      title={geo.spot ? 'Show marker in front of me' : 'Place marker again'}
                      dark
                      secondary
                      onPress={showMarker}
                    />
                  </View>
                )}
                {camera && !supportsSurfaceAR && (
                  <Text
                    style={{ color: 'white', textAlign: 'center', fontSize: 12, marginBottom: 8 }}
                  >
                    Surface AR needs the HistoryLens development build. Expo Go shows screen
                    markers.
                  </Text>
                )}
                {nativeAR && selected && !layerPanel && (
                  <View style={{ gap: 10 }}>
                    <Button
                      compact
                      title="Read full story"
                      onPress={() => setFullScreenStory(true)}
                    />
                    <Button
                      compact
                      title="Close AR information"
                      secondary
                      dark
                      onPress={dismissStory}
                    />
                  </View>
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
                          stackActions ? { width: '100%', height: 44 } : { flex: 1, height: 44 }
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
                      {geo.spot
                        ? 'Saved location'
                        : nativeAR
                          ? 'Surface AR'
                          : camera
                            ? 'Live camera'
                            : 'Demo scene'}{' '}
                      · {geo.spot ? (visited.includes('gun') ? 1 : 0) : visited.length}/
                      {geo.spot ? 1 : stops.length} stories explored
                    </Text>
                  </View>
                )}
                {mode === 'scan' && !selected ? (
                  <View style={s.scanControls}>
                    <RoundButton icon="mapLight" label="Open site map" dark onPress={openMap} />
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
                            mode === item.id && { color: C.green, fontFamily: 'Inter_700Bold' },
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
          />
        </View>
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

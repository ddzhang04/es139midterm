import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ViroARSceneNavigator, ViroARScene, ViroARPlaneSelector, ViroNode, ViroQuad, ViroText, ViroMaterials, ViroTrackingStateConstants } from '@reactvision/react-viro';
import type { ViroAnchor } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import { harvardTestStop, stops } from './content';
import { surfaceOffset } from './anchorPlacement';
import { persistentAnchorsEnabled } from './SurfaceARView';
import type { ViroCloudAnchor } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import type { SurfaceARProps } from './SurfaceARView';

ViroMaterials.createMaterials({
  HistoryLensRed: { diffuseColor: '#E75049', lightingModel: 'Constant', cullMode: 'None' },
  HistoryLensBlue: { diffuseColor: '#3485E8', lightingModel: 'Constant', cullMode: 'None' },
  HistoryLensSurface: { diffuseColor: '#D59A3A55', lightingModel: 'Constant', cullMode: 'None' },
  HistoryLensCard: { diffuseColor: '#F4F1E9', lightingModel: 'Constant', cullMode: 'None' },
});

type SceneProps = { sceneNavigator: { viroAppProps: SurfaceARProps; hostCloudAnchor: (id: string, days: number) => Promise<{ success: boolean; cloudAnchorId?: string }>; resolveCloudAnchor: (id: string) => Promise<{ success: boolean; anchor?: ViroCloudAnchor }> } };

export function PlacementScene({ sceneNavigator }: SceneProps = {} as SceneProps) {
  const app = sceneNavigator.viroAppProps;
  const selector = useRef<ViroARPlaneSelector>(null);
  const selectedAnchor = useRef<string | null>(null);
  const surfaces = useRef(new Set<string>());
  const stop = app.testSpot ? harvardTestStop : stops.find(item => item.id === app.stopId)!;
  const offset = useRef<[number, number, number]>([0, 0, 0]);
  const operation = useRef(0);
  const pending = useRef(false);
  const restored = useRef(false);
  const [resolved, setResolved] = useState<ViroCloudAnchor | null>(null);
  const latest = useRef(app); latest.current = app;
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; operation.current++; }, []);

  useEffect(() => {
    operation.current++; pending.current = false; restored.current = false; setResolved(null);
    selector.current?.reset();
    selectedAnchor.current = null;
    app.onPhaseChange(surfaces.current.size > 0 ? 'choose' : 'scanning');
  }, [app.revision, app.testSpot?.savedAt]);

  useEffect(() => {
    if (!persistentAnchorsEnabled || !app.testSpot?.anchor || app.revision > 0 || selectedAnchor.current) return;
    const saved = app.testSpot.anchor;
    if (saved.expiresAt <= Date.now()) { app.onPhaseChange('anchorError'); return; }
    let active = true;
    const generation = ++operation.current;
    pending.current = true;
    app.onPhaseChange('resolving');
    sceneNavigator.resolveCloudAnchor(saved.id).then(result => {
      if (!active || !mounted.current || generation !== operation.current) return;
      if (!result.success || !result.anchor) throw new Error('Anchor unavailable');
      selectedAnchor.current = result.anchor.anchorId; restored.current = true;
      offset.current = saved.offset; setResolved(result.anchor);
      latest.current.onPhaseChange('placed');
    }).catch(() => { if (active && mounted.current && generation === operation.current) latest.current.onPhaseChange('anchorError'); })
      .finally(() => { if (generation === operation.current) pending.current = false; });
    return () => { active = false; };
  }, [app.testSpot?.anchor?.id, app.testSpot?.savedAt, app.revision]);

  useEffect(() => {
    if (!app.saveRequest || !persistentAnchorsEnabled || !app.testSpot || !selectedAnchor.current || !app.onAnchorSaved || pending.current || restored.current) return;
    const generation = ++operation.current;
    const spotTime = app.testSpot.savedAt;
    const placementOffset = offset.current;
    pending.current = true;
    app.onPhaseChange('saving');
    sceneNavigator.hostCloudAnchor(selectedAnchor.current, 1).then(async result => {
      if (!mounted.current || generation !== operation.current) return;
      if (!result.success || !result.cloudAnchorId) throw new Error('Anchor not saved');
      await app.onAnchorSaved!({ id: result.cloudAnchorId, expiresAt: Date.now() + 86400000, offset: placementOffset }, spotTime);
      if (mounted.current && generation === operation.current) latest.current.onPhaseChange('placed');
    }).catch(() => { if (mounted.current && generation === operation.current) latest.current.onPhaseChange('anchorError'); })
      .finally(() => { if (generation === operation.current) pending.current = false; });
  }, [app.saveRequest]);

  function forwardFound(anchor: ViroAnchor) { selector.current?.handleAnchorFound(anchor); }
  function forwardUpdated(anchor: ViroAnchor) { selector.current?.handleAnchorUpdated(anchor); if (restored.current && selectedAnchor.current === anchor.anchorId) setResolved(current => current ? { ...current, position: anchor.position, rotation: anchor.rotation } : null); }
  function forwardRemoved(anchor?: ViroAnchor | null) {
    if (!anchor) return;
    selector.current?.handleAnchorRemoved(anchor);
    surfaces.current.delete(anchor.anchorId);
    if (selectedAnchor.current === anchor.anchorId) { selectedAnchor.current = null; restored.current = false; setResolved(null); operation.current++; pending.current = false; app.onDismiss(); app.onPhaseChange('lost'); }
  }

  const tile = <ViroNode visible={app.visible} opacity={app.opacity}>
        {/* Plane-local XZ is the surface. A quad is perfectly flat; 4 mm
            offset prevents flicker where virtual and real surfaces meet. */}
        <ViroQuad width={0.32} height={0.24} position={[0, 0.004, 0]} rotation={[-90, 0, 0]}
          materials={[stop.color === '#3485E8' ? 'HistoryLensBlue' : 'HistoryLensRed']}
          onClick={() => app.selected ? app.onDismiss() : app.onSelect(stop.id)} />
        <ViroText text="+" width={0.12} height={0.12} position={[0, 0.006, 0]} rotation={[-90, 0, 0]}
          style={{ color: '#FFFFFF', fontSize: 30, textAlign: 'center', textAlignVertical: 'center' }} ignoreEventHandling />
        {app.selected && <ViroNode position={[0, 0.42, 0]} transformBehaviors={['billboard']}>
          <ViroQuad width={0.64} height={0.38} materials={['HistoryLensCard']} />
          <ViroText text={`${stop.category.toUpperCase()} · ${stop.year}`} width={0.54} height={0.04} position={[-0.01, 0.13, 0.006]}
            style={{ color: '#A16C22', fontSize: 10, textAlign: 'left' }} ignoreEventHandling />
          <ViroText text={stop.title} width={0.54} height={0.07} position={[-0.01, 0.07, 0.006]}
            style={{ color: '#172521', fontSize: 19, fontWeight: 'bold', textAlign: 'left' }} ignoreEventHandling />
          <ViroText text={stop.description} width={0.54} height={0.16} position={[-0.01, -0.045, 0.006]}
            style={{ color: '#52605A', fontSize: 12, textAlign: 'left', textAlignVertical: 'top' }} ignoreEventHandling />
          <ViroText text="×" width={0.07} height={0.07} position={[0.275, 0.145, 0.008]}
            style={{ color: '#214E45', fontSize: 20, textAlign: 'center' }} onClick={app.onDismiss} />
        </ViroNode>}
      </ViroNode>;

  return <ViroARScene
    anchorDetectionTypes={['PlanesHorizontal', 'PlanesVertical']}
    onAnchorFound={forwardFound}
    onAnchorUpdated={forwardUpdated}
    onAnchorRemoved={forwardRemoved}
    onTrackingUpdated={state => {
      if (state !== ViroTrackingStateConstants.TRACKING_NORMAL) app.onPhaseChange('limited');
      else if (!pending.current) app.onPhaseChange(selectedAnchor.current ? 'placed' : surfaces.current.size > 0 ? 'choose' : 'scanning');
    }}
  >
    <ViroNode visible={!resolved}><ViroARPlaneSelector
      disableClickSelection={pending.current || !!resolved}
      ref={selector}
      alignment="Both"
      minWidth={0.35}
      minHeight={0.28}
      material="HistoryLensSurface"
      useActualShape
      hideOverlayOnSelection
      onPlaneDetected={anchor => { surfaces.current.add(anchor.anchorId); if (!selectedAnchor.current && !pending.current) app.onPhaseChange('choose'); return true; }}
      onPlaneSelected={(anchor, tap) => { selectedAnchor.current = anchor.anchorId; offset.current = tap ? surfaceOffset(tap, anchor.position, anchor.rotation) : [0, 0, 0]; app.onPhaseChange('placed'); }}
    >
      {tile}
    </ViroARPlaneSelector></ViroNode>
    {resolved && <ViroNode position={resolved.position} rotation={resolved.rotation}><ViroNode position={offset.current}>{tile}</ViroNode></ViroNode>}
  </ViroARScene>;
}

export default function NativeSurfaceAR(props: SurfaceARProps) {
  return <ViroARSceneNavigator style={StyleSheet.absoluteFill} initialScene={{ scene: PlacementScene }} viroAppProps={props}
    worldAlignment="Gravity" provider={persistentAnchorsEnabled ? "reactvision" : "none"} autofocus />;
}

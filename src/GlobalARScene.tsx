import useARSelection from './useARSelection';
import { panelFacingRotation, useARCameraPosition } from './arPanelFacing';
import ARInfoPanel from './components/ARInfoPanel';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  ViroARSceneNavigator,
  ViroARScene,
  ViroNode,
  ViroBox,
  ViroSphere,
  ViroText,
  ViroMaterials,
  ViroTrackingStateConstants,
} from '@reactvision/react-viro';
import type { ViroCameraTransform } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import type { SurfaceARProps } from './SurfaceARView';
import {
  globalToWorld,
  markerDirection,
  usableFix,
  Vector3,
  worldToGlobal,
} from './globalPlacement';
import { harvardTestStop } from './content';

ViroMaterials.createMaterials({
  GlobalMarkerRed: { diffuseColor: '#E75049', lightingModel: 'Constant' },
  GlobalMarkerTouch: {
    diffuseColor: '#FFFFFF',
    lightingModel: 'Constant',
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
});
type Navigator = { viroAppProps: SurfaceARProps };
export function GlobalPlacementScene(
  { sceneNavigator }: { sceneNavigator: Navigator } = {} as { sceneNavigator: Navigator },
) {
  const app = sceneNavigator.viroAppProps;
  const selection = useARSelection(app, 'gun');
  const facing = useARCameraPosition();
  const latest = useRef(app);
  latest.current = app;
  const camera = useRef<ViroCameraTransform | null>(null);
  const ready = useRef(false);
  const lastGuideTime = useRef(0);
  const position = useRef<Vector3 | null>(null);
  const pending = useRef(false);
  const failed = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const phase = useRef<'globalPlaced' | 'globalRestored' | 'globalSaved'>('globalPlaced');
  const [point, setPoint] = useState<Vector3 | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      latest.current.onMarkerGuide?.(null);
    };
  }, []);
  function place() {
    const props = latest.current;
    if (Platform.OS !== 'ios') {
      props.onPhaseChange('unsupported');
      props.onAnchorError?.('Global compass alignment currently requires the iPhone build.');
      return;
    }
    if (position.current || !ready.current || !camera.current) return;
    const saved = props.revision === 0 ? props.testSpot?.placement : null;
    if (saved && !usableFix(props.locationFix)) return;
    const next: Vector3 = saved
      ? globalToWorld(saved, props.locationFix!, camera.current.position)
      : (camera.current.position.map((v, i) => v + camera.current!.forward[i] * 2) as Vector3);
    position.current = next;
    setPoint(next);
    phase.current = saved ? 'globalRestored' : 'globalPlaced';
    props.onPhaseChange(phase.current);
  }
  useEffect(() => {
    generation.current++;
    pending.current = false;
    failed.current = false;
    position.current = null;
    setPoint(null);
    app.onMarkerGuide?.(null);
    app.onPhaseChange('globalWaiting');
    place();
  }, [app.testSpot?.savedAt, app.revision, app.restoreRequest]);
  useEffect(() => {
    place();
  }, [app.locationFix]);
  useEffect(() => {
    if (
      !app.saveRequest ||
      !position.current ||
      !camera.current ||
      !app.testSpot ||
      !app.onPlacementSaved ||
      pending.current
    )
      return;
    const op = ++generation.current;
    const time = app.testSpot.savedAt;
    pending.current = true;
    failed.current = false;
    void (async () => {
      try {
        if (!usableFix(app.locationFix))
          throw new Error('Wait for a fresh GPS reading before saving.');
        const saved = worldToGlobal(position.current!, app.locationFix, camera.current!.position);
        await app.onPlacementSaved!(saved, time);
        if (mounted.current && op === generation.current) {
          phase.current = 'globalSaved';
          latest.current.onPhaseChange('globalSaved');
        }
      } catch (cause) {
        if (mounted.current && op === generation.current) {
          failed.current = true;
          latest.current.onPhaseChange('anchorError');
          latest.current.onAnchorError?.(
            cause instanceof Error ? cause.message : 'Could not save global position. Try again.',
          );
        }
      } finally {
        if (op === generation.current) pending.current = false;
      }
    })();
  }, [app.saveRequest]);
  const savedTransform = app.revision === 0 ? app.testSpot?.placement : null;
  return (
    <ViroARScene
      onTrackingUpdated={(state) => {
        ready.current = state === ViroTrackingStateConstants.TRACKING_NORMAL;
        if (failed.current) return;
        if (!ready.current) app.onPhaseChange('limited');
        else {
          place();
          if (position.current && !pending.current) app.onPhaseChange(phase.current);
        }
      }}
      onCameraTransformUpdate={(transform) => {
        camera.current = transform;
        facing.update(transform.position);
        place();
        if (position.current && Date.now() - lastGuideTime.current >= 500) {
          lastGuideTime.current = Date.now();
          latest.current.onMarkerGuide?.(markerDirection(position.current, transform));
        }
      }}
    >
      {point && (
        <ViroNode
          position={point}
          rotation={savedTransform?.rotation || [0, 0, 0]}
          scale={savedTransform?.scale || [1, 1, 1]}
          visible={app.visible}
          opacity={app.opacity}
        >
          {/* Keep a small nonzero opacity so the native hit target remains
              active. Its bounds provide tap padding from every viewing angle. */}
          <ViroSphere
            radius={0.34}
            materials={['GlobalMarkerTouch']}
            opacity={0.01}
            visible={!selection.selected}
            highAccuracyEvents={false}
            onClickState={selection.press}
            onClick={selection.open}
          />
          <ViroBox
            width={0.48}
            height={0.36}
            length={0.12}
            materials={['GlobalMarkerRed']}
            visible={!selection.selected}
            onClick={selection.open}
            onClickState={selection.press}
            highAccuracyEvents={false}
          />
          <ViroText
            text="+"
            width={0.15}
            height={0.15}
            position={[0, 0, 0.065]}
            highAccuracyEvents={false}
            style={{
              color: '#FFFFFF',
              fontSize: 30,
              textAlign: 'center',
              textAlignVertical: 'center',
            }}
            onClick={selection.open}
            onClickState={selection.press}
            visible={!selection.selected}
          />
          {selection.selected && (
            <ARInfoPanel
              key={harvardTestStop.title}
              detail={harvardTestStop}
              onClose={selection.close}
              onListen={app.onListen}
              speaking={app.speaking}
              rotation={panelFacingRotation(
                facing.position,
                point,
                savedTransform?.rotation || [0, 0, 0],
              )}
            />
          )}
        </ViroNode>
      )}
    </ViroARScene>
  );
}
export default function NativeGlobalAR(props: SurfaceARProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <ViroARSceneNavigator
        style={{ flex: 1 }}
        initialScene={{ scene: GlobalPlacementScene }}
        viroAppProps={props}
        worldAlignment="GravityAndHeading"
        provider="none"
        autofocus
      />
    </View>
  );
}

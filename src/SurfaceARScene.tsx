import useARSelection from './useARSelection';
import { panelFacingRotation, useARCameraPosition } from './arPanelFacing';
import ARInfoPanel from './components/ARInfoPanel';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ViroARSceneNavigator,
  ViroARScene,
  ViroARPlaneSelector,
  ViroARPlane,
  ViroNode,
  ViroQuad,
  ViroText,
  ViroMaterials,
  ViroTrackingStateConstants,
} from '@reactvision/react-viro';
import type { ViroAnchor } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import { harvardTestStop, stops } from './content';
import { matchRestoredSurface } from './restoredSurface';
import { surfaceOffset, surfaceWorldPoint } from './anchorPlacement';
import { cloudAnchorError } from './cloudAnchorErrors';
import { persistentAnchorsEnabled } from './SurfaceARView';
import type { ViroCloudAnchor } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import type { SurfaceARProps } from './SurfaceARView';

ViroMaterials.createMaterials({
  HistoryLensRed: { diffuseColor: '#E75049', lightingModel: 'Constant', cullMode: 'None' },
  HistoryLensBlue: { diffuseColor: '#3485E8', lightingModel: 'Constant', cullMode: 'None' },
  HistoryLensSurface: { diffuseColor: '#D59A3A55', lightingModel: 'Constant', cullMode: 'None' },
});

type SceneProps = {
  sceneNavigator: {
    viroAppProps: SurfaceARProps;
    hostCloudAnchor: (
      id: string,
      days: number,
    ) => Promise<{ success: boolean; cloudAnchorId?: string; state?: string; error?: string }>;
    resolveCloudAnchor: (
      id: string,
    ) => Promise<{ success: boolean; anchor?: ViroCloudAnchor; state?: string; error?: string }>;
  };
};

export function PlacementScene({ sceneNavigator }: SceneProps = {} as SceneProps) {
  const app = sceneNavigator.viroAppProps;
  const selector = useRef<ViroARPlaneSelector>(null);
  const selectedAnchor = useRef<string | null>(null);
  const surfaces = useRef(new Set<string>());
  const planes = useRef(new Map<string, ViroAnchor>());
  const selectedPlane = useRef<ViroAnchor | null>(null);
  const candidate = useRef<ViroCloudAnchor | null>(null);
  const aligning = useRef(false);
  const alignmentTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [matched, setMatched] = useState<{
    anchorId: string;
    offset: [number, number, number];
  } | null>(null);
  const stop = app.testSpot ? harvardTestStop : stops.find((item) => item.id === app.stopId)!;
  const selection = useARSelection(app, stop.id);
  const facing = useARCameraPosition();
  const offset = useRef<[number, number, number]>([0, 0, 0]);
  const operation = useRef(0);
  const pending = useRef(false);
  const restored = useRef(false);
  const savedPlacement = useRef(false);
  const failed = useRef(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [resolved, setResolved] = useState<ViroCloudAnchor | null>(null);
  const latest = useRef(app);
  latest.current = app;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current++;
      clearTimeout(alignmentTimer.current);
    };
  }, []);

  useEffect(() => {
    operation.current++;
    pending.current = false;
    restored.current = false;
    savedPlacement.current = false;
    failed.current = false;
    aligning.current = false;
    candidate.current = null;
    clearTimeout(alignmentTimer.current);
    setMatched(null);
    setResolved(null);
    selector.current?.reset();
    selectedAnchor.current = null;
    app.onPhaseChange(surfaces.current.size > 0 ? 'choose' : 'scanning');
  }, [app.revision, app.testSpot?.savedAt, app.restoreRequest]);

  useEffect(() => {
    // React effects can run before the native AR view has a usable session.
    // Start resolving after the first normal tracking event instead.
    if (
      !sessionReady ||
      !persistentAnchorsEnabled ||
      !app.testSpot?.anchor ||
      app.revision > 0 ||
      selectedAnchor.current
    )
      return;
    const saved = app.testSpot.anchor;
    if (saved.expiresAt <= Date.now()) {
      failed.current = true;
      app.onPhaseChange('anchorError');
      app.onAnchorError?.('The saved anchor has expired. Place and save a new tile.');
      return;
    }
    let active = true;
    const generation = ++operation.current;
    pending.current = true;
    failed.current = false;
    app.onPhaseChange('resolving');
    sceneNavigator
      .resolveCloudAnchor(saved.id)
      .then((result) => {
        if (!active || !mounted.current || generation !== operation.current) return;
        if (!result.success || !result.anchor) throw result;
        selectedAnchor.current = result.anchor.anchorId;
        candidate.current = result.anchor;
        aligning.current = true;
        setResolved(result.anchor);
        latest.current.onPhaseChange('aligning');
        alignmentTimer.current = setTimeout(() => {
          if (mounted.current && generation === operation.current && aligning.current) {
            aligning.current = false;
            failed.current = true;
            latest.current.onPhaseChange('anchorError');
            latest.current.onAnchorError?.(
              'The saved position did not match a detected surface. Scan the original table and its surroundings, then retry.',
            );
          }
        }, 30000);
        verifySurface();
      })
      .catch((cause) => {
        if (active && mounted.current && generation === operation.current) {
          failed.current = true;
          latest.current.onPhaseChange('anchorError');
          latest.current.onAnchorError?.(cloudAnchorError(cause, 'restore'));
        }
      })
      .finally(() => {
        if (generation === operation.current) pending.current = false;
      });
    return () => {
      active = false;
    };
  }, [
    sessionReady,
    app.testSpot?.anchor?.id,
    app.testSpot?.savedAt,
    app.revision,
    app.restoreRequest,
  ]);

  useEffect(() => {
    if (
      !app.saveRequest ||
      !persistentAnchorsEnabled ||
      !app.testSpot ||
      !selectedAnchor.current ||
      !app.onAnchorSaved ||
      pending.current ||
      restored.current
    )
      return;
    const generation = ++operation.current;
    const spotTime = app.testSpot.savedAt;
    const placementOffset = offset.current;
    pending.current = true;
    failed.current = false;
    app.onPhaseChange('saving');
    sceneNavigator
      .hostCloudAnchor(selectedAnchor.current, 1)
      .then(async (result) => {
        if (!mounted.current || generation !== operation.current) return;
        if (!result.success || !result.cloudAnchorId) throw result;
        await app.onAnchorSaved!(
          {
            id: result.cloudAnchorId,
            expiresAt: Date.now() + 86400000,
            offset: placementOffset,
            surfaceAlignment:
              selectedPlane.current?.alignment === 'Vertical' ? 'Vertical' : 'Horizontal',
            surfaceClassification:
              selectedPlane.current?.classification &&
              !['None', 'Unknown'].includes(selectedPlane.current.classification)
                ? selectedPlane.current.classification
                : undefined,
          },
          spotTime,
        );
        if (mounted.current && generation === operation.current) {
          savedPlacement.current = true;
          latest.current.onPhaseChange('saved');
        }
      })
      .catch((cause) => {
        if (mounted.current && generation === operation.current) {
          failed.current = true;
          latest.current.onPhaseChange('anchorError');
          latest.current.onAnchorError?.(cloudAnchorError(cause, 'save'));
        }
      })
      .finally(() => {
        if (generation === operation.current) pending.current = false;
      });
  }, [app.saveRequest]);

  useEffect(() => {
    if (!matched) planes.current.forEach((anchor) => selector.current?.handleAnchorFound(anchor));
  }, [matched]);

  function verifySurface() {
    if (!aligning.current || !candidate.current || !latest.current.testSpot?.anchor) return;
    const match = matchRestoredSurface(candidate.current, latest.current.testSpot.anchor, [
      ...planes.current.values(),
    ]);
    if (!match) return;
    clearTimeout(alignmentTimer.current);
    aligning.current = false;
    restored.current = true;
    failed.current = false;
    setMatched(match);
    latest.current.onPhaseChange('restored');
  }
  function forwardFound(anchor: ViroAnchor) {
    selector.current?.handleAnchorFound(anchor);
    if (anchor.type === 'plane') planes.current.set(anchor.anchorId, anchor);
    verifySurface();
  }
  function forwardUpdated(anchor: ViroAnchor) {
    selector.current?.handleAnchorUpdated(anchor);
    if (anchor.type === 'plane') planes.current.set(anchor.anchorId, anchor);
    if (selectedPlane.current?.anchorId === anchor.anchorId) selectedPlane.current = anchor;
    if (aligning.current && selectedAnchor.current === anchor.anchorId)
      candidate.current = {
        ...candidate.current!,
        position: anchor.position,
        rotation: anchor.rotation,
      };
    verifySurface();
  }
  function forwardRemoved(anchor?: ViroAnchor | null) {
    if (!anchor) return;
    selector.current?.handleAnchorRemoved(anchor);
    surfaces.current.delete(anchor.anchorId);
    planes.current.delete(anchor.anchorId);
    if (selectedAnchor.current === anchor.anchorId || matched?.anchorId === anchor.anchorId) {
      selectedAnchor.current = null;
      restored.current = false;
      aligning.current = false;
      candidate.current = null;
      clearTimeout(alignmentTimer.current);
      setMatched(null);
      setResolved(null);
      operation.current++;
      pending.current = false;
      app.onDismiss();
      app.onPhaseChange('lost');
    }
  }

  const parentPlane = matched ? planes.current.get(matched.anchorId) : selectedPlane.current;
  const parentRotation = parentPlane?.rotation || [0, 0, 0];
  const panelPoint = surfaceWorldPoint(
    matched?.offset || offset.current,
    parentPlane?.position || [0, 0, 0],
    parentRotation,
  );
  const tile = (
    <ViroNode visible={app.visible} opacity={app.opacity}>
      {/* Plane-local XZ is the surface. A quad is perfectly flat; 4 mm
            offset prevents flicker where virtual and real surfaces meet. */}
      <ViroQuad
        width={0.32}
        height={0.24}
        position={[0, 0.004, 0]}
        rotation={[-90, 0, 0]}
        materials={[stop.color === '#3485E8' ? 'HistoryLensBlue' : 'HistoryLensRed']}
        visible={!selection.selected}
        onClick={selection.open}
        onClickState={selection.press}
      />
      <ViroText
        text="+"
        width={0.12}
        height={0.12}
        position={[0, 0.006, 0]}
        rotation={[-90, 0, 0]}
        style={{ color: '#FFFFFF', fontSize: 30, textAlign: 'center', textAlignVertical: 'center' }}
        onClick={selection.open}
        onClickState={selection.press}
        visible={!selection.selected}
      />
      {selection.selected && (
        <ARInfoPanel
          key={stop.title}
          detail={stop}
          onClose={selection.close}
          onListen={app.onListen}
          speaking={app.speaking}
          rotation={panelFacingRotation(facing.position, panelPoint, parentRotation)}
        />
      )}
    </ViroNode>
  );

  return (
    <ViroARScene
      onCameraTransformUpdate={(transform) => facing.update(transform.position)}
      anchorDetectionTypes={['PlanesHorizontal', 'PlanesVertical']}
      onAnchorFound={forwardFound}
      onAnchorUpdated={forwardUpdated}
      onAnchorRemoved={forwardRemoved}
      onTrackingUpdated={(state) => {
        if (state === ViroTrackingStateConstants.TRACKING_NORMAL) setSessionReady(true);
        if (pending.current || aligning.current || failed.current) return;
        if (state !== ViroTrackingStateConstants.TRACKING_NORMAL) app.onPhaseChange('limited');
        else
          app.onPhaseChange(
            restored.current
              ? 'restored'
              : savedPlacement.current
                ? 'saved'
                : selectedAnchor.current
                  ? 'placed'
                  : surfaces.current.size > 0
                    ? 'choose'
                    : 'scanning',
          );
      }}
    >
      {!matched && (
        <ViroNode visible={!resolved}>
          <ViroARPlaneSelector
            disableClickSelection={
              pending.current ||
              aligning.current ||
              !!resolved ||
              (!!app.testSpot?.anchor && app.revision === 0)
            }
            ref={selector}
            alignment="Both"
            minWidth={0.35}
            minHeight={0.28}
            material="HistoryLensSurface"
            useActualShape
            hideOverlayOnSelection
            onPlaneDetected={(anchor) => {
              surfaces.current.add(anchor.anchorId);
              if (
                !selectedAnchor.current &&
                !pending.current &&
                !aligning.current &&
                !failed.current
              )
                app.onPhaseChange('choose');
              return true;
            }}
            onPlaneSelected={(anchor, tap) => {
              failed.current = false;
              savedPlacement.current = false;
              selectedPlane.current = anchor;
              selectedAnchor.current = anchor.anchorId;
              offset.current = tap
                ? surfaceOffset(tap, anchor.position, anchor.rotation)
                : [0, 0, 0];
              app.onPhaseChange('placed');
            }}
          >
            {tile}
          </ViroARPlaneSelector>
        </ViroNode>
      )}
      {matched && (
        <ViroARPlane
          anchorId={matched.anchorId}
          alignment={
            app.testSpot?.anchor?.surfaceAlignment === 'Vertical' ? 'Vertical' : 'Horizontal'
          }
          onAnchorUpdated={forwardUpdated}
        >
          <ViroNode position={matched.offset}>{tile}</ViroNode>
        </ViroARPlane>
      )}
    </ViroARScene>
  );
}

export default function NativeSurfaceAR(props: SurfaceARProps) {
  return (
    <View testID="native-ar-viewport" style={StyleSheet.absoluteFill}>
      <ViroARSceneNavigator
        style={{ flex: 1 }}
        initialScene={{ scene: PlacementScene }}
        viroAppProps={props}
        worldAlignment="Gravity"
        provider={persistentAnchorsEnabled ? 'reactvision' : 'none'}
        autofocus
      />
    </View>
  );
}

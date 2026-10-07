import React, { useEffect, useState } from 'react';
import { ViroMaterials, ViroNode, ViroSphere } from '@reactvision/react-viro';
import type { ViroCameraTransform } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import { campusPlaces, campusSpot, campusStory, type CampusPlace } from '../mapPlaces';
import { globalToWorld, usableFix, type Vector3 } from '../globalPlacement';
import { readingPanelPose } from '../arPanelFacing';
import type { SurfaceARProps } from '../SurfaceARView';
import useARSelection from '../useARSelection';
import ARInfoPanel from './ARInfoPanel';
import ARAnalogCamera from './ARAnalogCamera';
import ARTitanic from './ARTitanic';
import type { ScanCandidate } from '../objectScanning';

type Marker = { place: CampusPlace; position: Vector3 };
ViroMaterials.createMaterials({
  CampusBeacon: {
    diffuseColor: '#FF443A',
    lightingModel: 'Constant',
    cullMode: 'None',
    readsFromDepthBuffer: false,
    writesToDepthBuffer: false,
  },
});
export default function CampusARMarkers({
  app,
  camera,
  ready,
  onScanCandidates,
}: {
  app: SurfaceARProps;
  camera: ViroCameraTransform | null;
  ready: boolean;
  onScanCandidates?: (candidates: ScanCandidate[]) => void;
}) {
  const [markers, setMarkers] = useState<Marker[] | null>(null);
  useEffect(() => {
    if (markers || !ready || !camera || !usableFix(app.locationFix)) return;
    // Establish one GPS-to-AR origin for every campus dot. Later GPS updates
    // must not move the dots or swap the content of a different marker.
    setMarkers(
      campusPlaces.map((place) => ({
        place,
        position: globalToWorld(campusSpot(place).placement!, app.locationFix!, camera.position),
      })),
    );
  }, [markers, ready, camera, app.locationFix]);
  useEffect(() => {
    onScanCandidates?.(
      markers?.flatMap(({ place, position }) => [
        { id: place.id, storyId: place.id, title: place.title, position },
        ...(place.id === 'harvard-science-center'
          ? [
              {
                id: 'science-center-camera' as const,
                storyId: place.id,
                title: 'Polaroid Land camera',
                position: [position[0] + 1.35, position[1] - 0.1, position[2]] as Vector3,
              },
            ]
          : []),
      ]) || [],
    );
    return () => onScanCandidates?.([]);
  }, [markers, onScanCandidates]);
  return (
    <ViroNode position={[0, 0, 0]}>
      {markers?.map((marker) => (
        <CampusMarker key={marker.place.id} marker={marker} app={app} camera={camera} />
      ))}
    </ViroNode>
  );
}

function CampusMarker({
  marker,
  app,
  camera,
}: {
  marker: Marker;
  app: SurfaceARProps;
  camera: ViroCameraTransform | null;
}) {
  const story = campusStory(marker.place);
  const selection = useARSelection({ ...app, selected: app.selectedStopId === story.id }, story.id);
  const pose = camera
    ? readingPanelPose(camera.position, camera.forward, marker.position)
    : undefined;
  const distance = camera
    ? Math.hypot(...marker.position.map((v, i) => v - camera.position[i]))
    : Infinity;
  const visible = !!app.campusMarkersVisible && (distance <= 200 || selection.selected);
  return (
    <ViroNode position={marker.position} visible={visible} opacity={app.opacity}>
      {marker.place.id === 'harvard-science-center' && (
        <ARAnalogCamera onOpen={selection.open} onPress={selection.press} />
      )}
      {marker.place.id === 'widener-library' && <ARTitanic onOpen={selection.open} />}
      <ViroSphere
        radius={Math.max(0.5, Math.min(2, distance * 0.025))}
        position={[0, 0, 0]}
        materials={['CampusBeacon']}
        renderingOrder={100}
        visible={!selection.selected}
        highAccuracyEvents={false}
        onClick={selection.open}
        onClickState={selection.press}
      />
      <ViroSphere
        radius={Math.max(0.65, Math.min(2, distance * 0.035))}
        materials={['GlobalMarkerTouch']}
        visible={!selection.selected}
        highAccuracyEvents={false}
        onClick={selection.open}
        onClickState={selection.press}
      />
      {selection.selected && (
        <ARInfoPanel
          key={story.id}
          detail={story}
          parentPosition={marker.position}
          page={app.storyPage}
          onPageChange={app.onStoryPageChange}
          position={pose?.position}
          rotation={pose?.rotation}
          onClose={selection.close}
          onListen={app.onListen}
          speaking={app.speaking}
          onExpand={app.onExpand}
        />
      )}
    </ViroNode>
  );
}

import React from 'react';
import { ViroBox, ViroMaterials, ViroSphere } from '@reactvision/react-viro';
import type { ViroClickState } from '@reactvision/react-viro/dist/components/Types/ViroEvents';

ViroMaterials.createMaterials({
  TreeBark: { diffuseColor: '#956143', lightingModel: 'Constant' },
  TreeBarkDark: { diffuseColor: '#694631', lightingModel: 'Constant' },
  TreeLeaves: { diffuseColor: '#589446', lightingModel: 'Constant' },
  TreeLeavesLight: { diffuseColor: '#79AD54', lightingModel: 'Constant' },
  TreeLeavesDark: { diffuseColor: '#397344', lightingModel: 'Constant' },
});

// All pieces have depth, including the branches and asymmetrical canopy.
// Constant materials keep the cartoon colors legible without scene lighting.
export default function ARTree({
  onOpen,
  onPress,
}: {
  onOpen: () => void;
  onPress: (state: ViroClickState) => void;
}) {
  const touch = { onClick: onOpen, onClickState: onPress, highAccuracyEvents: false };
  return (
    <>
      <ViroBox
        {...touch}
        materials={['TreeBark']}
        scale={[0.19, 0.85, 0.21]}
        position={[0, -0.31, 0]}
        rotation={[0, 0, -6]}
      />
      <ViroBox
        {...touch}
        materials={['TreeBarkDark']}
        scale={[0.12, 0.48, 0.13]}
        position={[-0.18, 0.05, 0]}
        rotation={[10, 0, 48]}
      />
      <ViroBox
        {...touch}
        materials={['TreeBark']}
        scale={[0.11, 0.5, 0.12]}
        position={[0.2, 0.13, 0.03]}
        rotation={[-16, 10, -42]}
      />
      <ViroBox
        {...touch}
        materials={['TreeBarkDark']}
        scale={[0.1, 0.38, 0.11]}
        position={[0.02, 0.12, -0.19]}
        rotation={[-48, 0, 0]}
      />
      <ViroSphere
        {...touch}
        radius={0.38}
        widthSegmentCount={7}
        heightSegmentCount={5}
        materials={['TreeLeaves']}
        position={[-0.28, 0.32, 0.02]}
        scale={[1.05, 0.9, 0.95]}
      />
      <ViroSphere
        {...touch}
        radius={0.37}
        widthSegmentCount={7}
        heightSegmentCount={5}
        materials={['TreeLeavesLight']}
        position={[0.04, 0.54, 0.01]}
        scale={[0.9, 1.08, 1]}
      />
      <ViroSphere
        {...touch}
        radius={0.34}
        widthSegmentCount={7}
        heightSegmentCount={5}
        materials={['TreeLeavesDark']}
        position={[0.31, 0.29, 0.02]}
        scale={[1.05, 0.95, 1]}
      />
      <ViroSphere
        {...touch}
        radius={0.31}
        widthSegmentCount={7}
        heightSegmentCount={5}
        materials={['TreeLeaves']}
        position={[0.04, 0.32, -0.27]}
      />
    </>
  );
}

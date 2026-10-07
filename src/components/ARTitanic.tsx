import React from 'react';
import { ViroBox, ViroMaterials, ViroNode, ViroSphere } from '@reactvision/react-viro';
import useModelGestures from '../useModelGestures';

ViroMaterials.createMaterials({
  TitanicHull: { diffuseColor: '#202833', lightingModel: 'Constant' },
  TitanicLowerHull: { diffuseColor: '#943A32', lightingModel: 'Constant' },
  TitanicDeck: { diffuseColor: '#D6BB8C', lightingModel: 'Constant' },
  TitanicCabin: { diffuseColor: '#F3EEE1', lightingModel: 'Constant' },
  TitanicFunnel: { diffuseColor: '#D99850', lightingModel: 'Constant' },
});

// A deliberately simplified four-funnel ocean liner, rather than a scale replica.
export default function ARTitanic({ onOpen }: { onOpen: () => void }) {
  const gesture = useModelGestures(onOpen);
  const touch = { onClick: gesture.onClick, onPinch: gesture.onPinch, onRotate: gesture.onRotate };
  return (
    <ViroNode
      position={[2, -0.15, 0]}
      rotation={[0, gesture.yaw, 0]}
      scale={[gesture.scale, gesture.scale, gesture.scale]}
    >
      <ViroSphere
        radius={1}
        scale={[1.35, 0.19, 0.23]}
        materials={['TitanicLowerHull']}
        {...touch}
      />
      <ViroSphere
        radius={1}
        position={[0, 0.13, 0]}
        scale={[1.4, 0.2, 0.25]}
        materials={['TitanicHull']}
        {...touch}
      />
      <ViroBox
        width={2.4}
        height={0.05}
        length={0.43}
        position={[0, 0.29, 0]}
        materials={['TitanicDeck']}
        {...touch}
      />
      <ViroBox
        width={1.85}
        height={0.17}
        length={0.35}
        position={[0, 0.39, 0]}
        materials={['TitanicCabin']}
        {...touch}
      />
      <ViroBox
        width={1.6}
        height={0.04}
        length={0.37}
        position={[0, 0.5, 0]}
        materials={['TitanicDeck']}
        {...touch}
      />
      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <ViroNode key={x} position={[x, 0.64, 0]} rotation={[0, 0, -8]}>
          <ViroBox
            width={0.13}
            height={0.28}
            length={0.13}
            materials={['TitanicFunnel']}
            {...touch}
          />
          <ViroBox
            width={0.14}
            height={0.07}
            length={0.14}
            position={[0, 0.12, 0]}
            materials={['TitanicHull']}
            {...touch}
          />
        </ViroNode>
      ))}
      {[-1.02, 1.02].map((x) => (
        <ViroBox
          key={x}
          width={0.025}
          height={0.65}
          length={0.025}
          position={[x, 0.61, 0]}
          materials={['TitanicDeck']}
          {...touch}
        />
      ))}
      {[-1, 1].flatMap((side) =>
        [-0.65, -0.35, 0, 0.35, 0.65].map((x) => (
          <ViroSphere
            key={`${side}-${x}`}
            radius={1}
            scale={[0.12, 0.035, 0.035]}
            position={[x, 0.51, side * 0.19]}
            materials={['TitanicCabin']}
            {...touch}
          />
        )),
      )}
    </ViroNode>
  );
}

import React from 'react';
import { ViroBox, ViroMaterials, ViroNode, ViroSphere } from '@reactvision/react-viro';
import type { ViroClickState } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import useModelGestures from '../useModelGestures';

ViroMaterials.createMaterials({
  FilmCameraLeather: { diffuseColor: '#735238', lightingModel: 'Constant' },
  FilmCameraSilver: { diffuseColor: '#D5D2C8', lightingModel: 'Constant' },
  FilmCameraMetal: { diffuseColor: '#777970', lightingModel: 'Constant' },
  FilmCameraBellows: { diffuseColor: '#201E1C', lightingModel: 'Constant' },
  FilmCameraFold: { diffuseColor: '#484038', lightingModel: 'Constant' },
  FilmCameraLens: { diffuseColor: '#102128', lightingModel: 'Constant' },
  FilmCameraReflection: { diffuseColor: '#87B4B9', lightingModel: 'Constant' },
  FilmCameraShutter: { diffuseColor: '#B49A6C', lightingModel: 'Constant' },
});

// Stylized early Polaroid Land Model 95: brown roll-film body, extended
// accordion bellows, folding bed and a separate chrome lens standard.
// An illustrative model, not a claim about Sert's design inspiration.
export default function ARAnalogCamera({
  onOpen,
}: {
  onOpen: () => void;
  onPress: (state: ViroClickState) => void;
}) {
  const gesture = useModelGestures(onOpen);
  const touch = {
    onClick: gesture.onClick,
    onPinch: gesture.onPinch,
    onRotate: gesture.onRotate,
    highAccuracyEvents: false,
  };
  return (
    <ViroNode
      position={[1.35, -0.1, 0]}
      rotation={[0, gesture.yaw, 0]}
      scale={[gesture.scale, gesture.scale, gesture.scale]}
      onPinch={gesture.onPinch}
      onRotate={gesture.onRotate}
    >
      <ViroBox
        {...touch}
        width={0.85}
        height={0.5}
        length={0.28}
        materials={['FilmCameraLeather']}
      />
      {[-1, 1].map((side) => (
        <ViroNode key={side}>
          <ViroBox
            {...touch}
            width={0.075}
            height={0.52}
            length={0.3}
            position={[side * 0.41, 0, 0]}
            materials={['FilmCameraSilver']}
          />
          <ViroBox
            {...touch}
            width={0.87}
            height={0.035}
            length={0.3}
            position={[0, side * 0.25, 0]}
            materials={['FilmCameraSilver']}
          />
          <ViroBox
            {...touch}
            width={0.025}
            height={0.025}
            length={0.64}
            position={[side * 0.25, -0.17, 0.42]}
            rotation={[-12, side * -15, 0]}
            materials={['FilmCameraSilver']}
          />
        </ViroNode>
      ))}
      {/* Open folding bed, extending beneath the bellows and lens. */}
      <ViroBox
        {...touch}
        width={0.64}
        height={0.045}
        length={0.96}
        position={[0, -0.285, 0.39]}
        materials={['FilmCameraSilver']}
      />
      <ViroBox
        {...touch}
        width={0.56}
        height={0.02}
        length={0.86}
        position={[0, -0.253, 0.39]}
        materials={['FilmCameraLeather']}
      />
      {Array.from({ length: 9 }, (_, index) => {
        const width = 0.65 - index * 0.031;
        const height = 0.41 - index * 0.011;
        return (
          <ViroBox
            key={index}
            {...touch}
            width={width}
            height={height}
            length={0.085}
            position={[0, 0, 0.17 + index * 0.06]}
            materials={[index % 2 ? 'FilmCameraBellows' : 'FilmCameraFold']}
          />
        );
      })}
      <ViroBox
        {...touch}
        width={0.44}
        height={0.38}
        length={0.065}
        position={[0, 0, 0.72]}
        materials={['FilmCameraSilver']}
      />
      <ViroBox
        {...touch}
        width={0.38}
        height={0.32}
        length={0.02}
        position={[0, 0, 0.76]}
        materials={['FilmCameraMetal']}
      />
      <ViroSphere
        {...touch}
        radius={0.15}
        scale={[1, 1, 0.38]}
        position={[0, 0, 0.795]}
        materials={['FilmCameraSilver']}
      />
      <ViroSphere
        {...touch}
        radius={0.115}
        scale={[1, 1, 0.22]}
        position={[0, 0, 0.845]}
        materials={['FilmCameraBellows']}
      />
      <ViroSphere
        {...touch}
        radius={0.08}
        scale={[1, 1, 0.12]}
        position={[0, 0, 0.868]}
        materials={['FilmCameraLens']}
      />
      <ViroSphere
        {...touch}
        radius={0.022}
        scale={[1, 0.6, 0.08]}
        position={[-0.025, 0.027, 0.878]}
        materials={['FilmCameraReflection']}
      />
      {/* Optical finder and top carry handle, characteristic of folding cameras. */}
      <ViroBox
        {...touch}
        width={0.17}
        height={0.095}
        length={0.22}
        position={[-0.24, 0.3, 0]}
        materials={['FilmCameraSilver']}
      />
      <ViroBox
        {...touch}
        width={0.105}
        height={0.055}
        length={0.015}
        position={[-0.24, 0.3, 0.12]}
        materials={['FilmCameraLens']}
      />
      <ViroBox
        {...touch}
        width={0.33}
        height={0.04}
        length={0.07}
        position={[0.08, 0.33, -0.02]}
        materials={['FilmCameraLeather']}
      />
      {[-0.065, 0.225].map((x) => (
        <ViroBox
          key={x}
          {...touch}
          width={0.025}
          height={0.075}
          length={0.07}
          position={[x, 0.29, -0.02]}
          materials={['FilmCameraSilver']}
        />
      ))}
      <ViroSphere
        {...touch}
        radius={0.043}
        scale={[1, 0.4, 1]}
        position={[0.32, 0.29, 0.04]}
        materials={['FilmCameraShutter']}
      />
    </ViroNode>
  );
}

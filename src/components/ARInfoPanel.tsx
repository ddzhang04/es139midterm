import React, { useState } from 'react';
import { ViroMaterials, ViroNode, ViroQuad, ViroText } from '@reactvision/react-viro';
import { stops } from '../content';
import type { Vector3 } from '../anchorPlacement';

ViroMaterials.createMaterials({
  ARInfoBackground: {
    diffuseColor: '#F4F1E9',
    lightingModel: 'Constant',
    cullMode: 'None',
    writesToDepthBuffer: true,
    readsFromDepthBuffer: true,
  },
  ARInfoButton: {
    diffuseColor: '#214E45',
    lightingModel: 'Constant',
    cullMode: 'None',
    writesToDepthBuffer: true,
    readsFromDepthBuffer: true,
  },
  ARInfoText: {
    lightingModel: 'Constant',
    cullMode: 'None',
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
});

// Backing surfaces write depth behind the glyphs so they cannot paint over
// native bitmap text in another render pass. Bounds constrain each text field.
const flatText = {
  highAccuracyEvents: false,
  extrusionDepth: 0,
  materials: ['ARInfoText'],
  renderingOrder: 12,
  textClipMode: 'ClipToBounds' as const,
  textLineBreakMode: 'WordWrap' as const,
};

// Larger glyph textures scaled back down keep text sharp at AR viewing distances.
function ARText({ width = 1, height = 1, style, ...props }: React.ComponentProps<typeof ViroText>) {
  return (
    <ViroText
      {...flatText}
      {...props}
      width={width * 4}
      height={height * 4}
      scale={[0.25, 0.25, 0.25]}
      style={{ ...style, fontSize: (style?.fontSize || 10) * 4 }}
    />
  );
}

// Short pages keep the complete story legible within a fixed world-space panel.
export function storyPages(text: string): string[] {
  const pages: string[] = [];
  let page = '';
  for (const word of text.split(/\s+/)) {
    if (page && page.length + word.length + 1 > 80) {
      pages.push(page);
      page = '';
    }
    page += (page ? ' ' : '') + word;
  }
  if (page) pages.push(page);
  return pages.length ? pages : [''];
}

function ARButton({
  label,
  x,
  y = -0.36,
  width = 0.28,
  onPress,
}: {
  label: string;
  x: number;
  y?: number;
  width?: number;
  onPress: () => void;
}) {
  return (
    <ViroNode position={[x, y, 0.012]}>
      <ViroQuad
        width={width}
        height={0.12}
        renderingOrder={11}
        materials={['ARInfoButton']}
        onClick={onPress}
      />
      <ARText
        text={label}
        textClipMode="None"
        width={width - 0.02}
        height={0.1}
        position={[0, 0, 0.025]}
        style={{
          fontFamily: 'Arial',
          color: '#FFFFFF',
          fontSize: 5,
          textAlign: 'center',
          textAlignVertical: 'center',
        }}
        onClick={onPress}
      />
    </ViroNode>
  );
}

export default function ARInfoPanel({
  detail,
  onClose,
  onListen,
  speaking = false,
  rotation = [0, 0, 0],
  onExpand,
  position = [0, 0, 0],
}: {
  detail: (typeof stops)[number];
  onClose: () => void;
  onListen?: () => void;
  speaking?: boolean;
  rotation?: Vector3;
  onExpand?: () => void;
  position?: Vector3;
}) {
  const [page, setPage] = useState(0);
  // Face the user once when opened, then keep the world-space orientation fixed.
  const [lockedRotation] = useState<Vector3>(() => [...rotation]);
  const [lockedPosition] = useState<Vector3>(() => [...position]);
  const pages = [...storyPages(detail.description), ...storyPages(detail.story)];
  const index = Math.min(page, pages.length - 1);
  return (
    <ViroNode position={lockedPosition} rotation={lockedRotation} highAccuracyEvents={false}>
      <ViroQuad
        width={1.12}
        height={onExpand ? 1.16 : 0.96}
        renderingOrder={10}
        materials={['ARInfoBackground']}
      />
      <ARText
        text={`${detail.category.toUpperCase()} · ${detail.year}`}
        width={0.84}
        height={0.1}
        position={[-0.045, 0.435, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#6D4817',
          fontSize: 6,
          textAlign: 'left',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ARText
        text={detail.title}
        width={0.92}
        height={0.22}
        position={[0, 0.27, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#172521',
          fontSize: 8.5,
          fontWeight: 'bold',
          textAlign: 'left',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ARText
        text={pages[index]}
        width={0.92}
        height={0.36}
        position={[0, -0.025, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#172521',
          fontSize: 6.5,
          textAlign: 'left',
          textAlignVertical: 'top',
        }}
        ignoreEventHandling
      />
      <ARText
        text={`${index + 1} / ${pages.length}`}
        width={0.18}
        height={0.09}
        position={[0, -0.265, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#172521',
          fontSize: 4.5,
          textAlign: 'center',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ViroNode position={[0.49, 0.4, 0.012]}>
        <ViroQuad
          width={0.11}
          height={0.11}
          renderingOrder={11}
          materials={['ARInfoButton']}
          onClick={onClose}
        />
        <ARText
          text="×"
          textClipMode="None"
          width={0.1}
          height={0.1}
          position={[0, 0, 0.025]}
          style={{
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontSize: 6,
            textAlign: 'center',
            textAlignVertical: 'center',
          }}
          onClick={onClose}
        />
      </ViroNode>
      {index > 0 && <ARButton label="Back" x={-0.34} onPress={() => setPage(index - 1)} />}
      {onListen && <ARButton label={speaking ? 'Stop' : 'Listen'} x={0} onPress={onListen} />}
      {index < pages.length - 1 && (
        <ARButton label="Next" x={0.34} onPress={() => setPage(index + 1)} />
      )}
      {onExpand && (
        <ARButton label="Read full screen" x={0} y={-0.49} width={0.92} onPress={onExpand} />
      )}
    </ViroNode>
  );
}

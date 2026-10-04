import React, { useState } from 'react';
import { ViroMaterials, ViroNode, ViroQuad, ViroText } from '@reactvision/react-viro';
import { stops } from '../content';
import type { Vector3 } from '../anchorPlacement';

ViroMaterials.createMaterials({
  ARInfoBackground: {
    diffuseColor: '#F4F1E9',
    lightingModel: 'Constant',
    cullMode: 'None',
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  ARInfoButton: {
    diffuseColor: '#214E45',
    lightingModel: 'Constant',
    cullMode: 'None',
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  ARInfoText: {
    lightingModel: 'Constant',
    cullMode: 'None',
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
});

// Explicit draw order and flat text prevent the card/background from obscuring
// glyphs. Bounds constrain each field independently of its font size.
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

function ARButton({ label, x, onPress }: { label: string; x: number; onPress: () => void }) {
  return (
    <ViroNode position={[x, -0.36, 0.012]}>
      <ViroQuad
        width={0.28}
        height={0.12}
        renderingOrder={11}
        materials={['ARInfoButton']}
        onClick={onPress}
      />
      <ARText
        text={label}
        width={0.26}
        height={0.1}
        position={[0, 0, 0.025]}
        style={{
          fontFamily: 'Arial',
          color: '#FFFFFF',
          fontSize: 9,
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
}: {
  detail: (typeof stops)[number];
  onClose: () => void;
  onListen?: () => void;
  speaking?: boolean;
  rotation?: Vector3;
}) {
  const [page, setPage] = useState(0);
  const pages = [...storyPages(detail.description), ...storyPages(detail.story)];
  const index = Math.min(page, pages.length - 1);
  return (
    <ViroNode position={[0, 0, 0]} rotation={rotation} highAccuracyEvents={false}>
      <ViroQuad width={1.12} height={0.96} renderingOrder={10} materials={['ARInfoBackground']} />
      <ARText
        text={`${detail.category.toUpperCase()} · ${detail.year}`}
        width={0.84}
        height={0.07}
        position={[-0.045, 0.405, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#6D4817',
          fontSize: 8,
          textAlign: 'left',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ARText
        text={detail.title}
        width={0.92}
        height={0.16}
        position={[0, 0.3, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#172521',
          fontSize: 14,
          fontWeight: 'bold',
          textAlign: 'left',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ARText
        text={pages[index]}
        width={0.92}
        height={0.42}
        position={[0, 0, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#172521',
          fontSize: 9,
          textAlign: 'left',
          textAlignVertical: 'top',
        }}
        ignoreEventHandling
      />
      <ARText
        text={`${index + 1} / ${pages.length}`}
        width={0.18}
        height={0.06}
        position={[0, -0.265, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#172521',
          fontSize: 7,
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
          width={0.1}
          height={0.1}
          position={[0, 0, 0.025]}
          style={{
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontSize: 12,
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
    </ViroNode>
  );
}

import React, { useState } from 'react';
import { ViroMaterials, ViroNode, ViroQuad, ViroText } from '@reactvision/react-viro';
import { stops } from '../content';

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
  extrusionDepth: 0,
  materials: ['ARInfoText'],
  renderingOrder: 12,
  textClipMode: 'ClipToBounds' as const,
  textLineBreakMode: 'WordWrap' as const,
};

// Short pages keep the complete story legible within a fixed world-space panel.
export function storyPages(text: string): string[] {
  const pages: string[] = [];
  let page = '';
  for (const word of text.split(/\s+/)) {
    if (page && page.length + word.length + 1 > 120) {
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
    <ViroNode position={[x, -0.285, 0.012]}>
      <ViroQuad
        width={0.2}
        height={0.08}
        renderingOrder={11}
        materials={['ARInfoButton']}
        onClick={onPress}
      />
      <ViroText
        {...flatText}
        text={label}
        width={0.19}
        height={0.07}
        position={[0, 0, 0.025]}
        style={{
          fontFamily: 'Arial',
          color: '#FFFFFF',
          fontSize: 7,
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
}: {
  detail: (typeof stops)[number];
  onClose: () => void;
  onListen?: () => void;
  speaking?: boolean;
}) {
  const [page, setPage] = useState(0);
  const pages = [detail.description, ...storyPages(detail.story)];
  const index = Math.min(page, pages.length - 1);
  return (
    <ViroNode position={[0, 0, 0]} transformBehaviors={['billboard']}>
      <ViroQuad width={0.84} height={0.8} renderingOrder={10} materials={['ARInfoBackground']} />
      <ViroText
        {...flatText}
        text={`${detail.category.toUpperCase()} · ${detail.year}`}
        width={0.66}
        height={0.055}
        position={[-0.025, 0.32, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#A16C22',
          fontSize: 6,
          textAlign: 'left',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ViroText
        {...flatText}
        text={detail.title}
        width={0.68}
        height={0.12}
        position={[0, 0.21, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#172521',
          fontSize: 11,
          fontWeight: 'bold',
          textAlign: 'left',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ViroText
        {...flatText}
        text={pages[index]}
        width={0.68}
        height={0.3}
        position={[0, -0.015, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#52605A',
          fontSize: 7,
          textAlign: 'left',
          textAlignVertical: 'top',
        }}
        ignoreEventHandling
      />
      <ViroText
        {...flatText}
        text={`${index + 1} / ${pages.length}`}
        width={0.18}
        height={0.04}
        position={[0, -0.205, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#52605A',
          fontSize: 5,
          textAlign: 'center',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ViroNode position={[0.365, 0.3, 0.012]}>
        <ViroQuad
          width={0.08}
          height={0.08}
          renderingOrder={11}
          materials={['ARInfoButton']}
          onClick={onClose}
        />
        <ViroText
          {...flatText}
          text="×"
          width={0.075}
          height={0.075}
          position={[0, 0, 0.025]}
          style={{
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontSize: 9,
            textAlign: 'center',
            textAlignVertical: 'center',
          }}
          onClick={onClose}
        />
      </ViroNode>
      {index > 0 && <ARButton label="Previous" x={-0.25} onPress={() => setPage(index - 1)} />}
      {onListen && <ARButton label={speaking ? 'Stop audio' : 'Listen'} x={0} onPress={onListen} />}
      {index < pages.length - 1 && (
        <ARButton label="Next" x={0.25} onPress={() => setPage(index + 1)} />
      )}
    </ViroNode>
  );
}

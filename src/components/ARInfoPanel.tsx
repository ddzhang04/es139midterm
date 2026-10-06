import React, { useCallback, useRef, useState } from 'react';
import { ViroBox, ViroMaterials, ViroNode, ViroQuad, ViroText } from '@reactvision/react-viro';
import { stops } from '../content';
import type { ViroClickState } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
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
  y = -0.4,
  width = 0.34,
  height = 0.18,
  fontSize = 5,
  onPress,
}: {
  label: string;
  x: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  onPress: () => void;
}) {
  const latestPress = useRef(onPress);
  latestPress.current = onPress;
  const pressed = useRef(false);
  const lastPress = useRef(-Infinity);
  const mountedAt = useRef(Date.now());
  const press = useCallback((state: ViroClickState) => {
    if (state === 1 && (!pressed.current || Date.now() - lastPress.current > 600)) {
      pressed.current = true;
      lastPress.current = Date.now();
      latestPress.current();
    } else if (state === 2 || state === 3) {
      pressed.current = false;
    }
  }, []);
  const click = useCallback(() => {
    // Native hit testing may deliver click without clickState. Ignore the
    // opening tap's release and any click following our own touch-down.
    const now = Date.now();
    if (now - mountedAt.current < 500 || now - lastPress.current < 600) return;
    lastPress.current = now;
    pressed.current = false;
    latestPress.current();
  }, []);
  // Require a fresh contact on this button. A release from the tap that
  // opened the card must never activate a newly mounted action underneath it.
  return (
    <ViroNode
      position={[x, y, 0.012]}
      highAccuracyEvents={false}
      onClickState={press}
      onClick={click}
    >
      <ARText
        text={label}
        textClipMode="ClipToBounds"
        width={width - 0.02}
        height={height - 0.02}
        position={[0, 0, 0.025]}
        style={{
          fontFamily: 'Arial',
          color: '#FFFFFF',
          fontSize,
          textAlign: 'center',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ViroBox
        width={width}
        height={height}
        length={0.012}
        position={[0, 0, 0]}
        materials={['ARInfoButton']}
        renderingOrder={11}
        highAccuracyEvents={false}
        onClickState={press}
        onClick={click}
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
  const pages = [
    ...storyPages(detail.description),
    ...(detail.story === detail.description ? [] : storyPages(detail.story)),
  ];
  const index = Math.min(page, pages.length - 1);
  return (
    <ViroNode position={lockedPosition} rotation={lockedRotation} highAccuracyEvents={false}>
      {/* 12 cm content padding, with distinct header, body and action rows. */}
      <ViroQuad
        width={1.4}
        height={1.5}
        renderingOrder={10}
        materials={['ARInfoBackground']}
        ignoreEventHandling
      />
      <ARText
        text={`${detail.category.toUpperCase()} · ${detail.year}`}
        width={0.93}
        height={0.1}
        position={[-0.115, 0.6, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#6D4817',
          fontSize: 5,
          textAlign: 'left',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ARText
        text={detail.title}
        width={1.16}
        height={0.26}
        position={[0, 0.39, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#172521',
          fontSize: 7.5,
          fontWeight: 'bold',
          textAlign: 'left',
          textAlignVertical: 'top',
        }}
        ignoreEventHandling
      />
      <ARText
        text={pages[index]}
        width={1.16}
        height={0.4}
        position={[0, 0.02, 0.03]}
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
        position={[0, -0.25, 0.03]}
        style={{
          fontFamily: 'Arial',
          color: '#172521',
          fontSize: 4.5,
          textAlign: 'center',
          textAlignVertical: 'center',
        }}
        ignoreEventHandling
      />
      <ARButton
        label="×"
        x={0.58}
        y={0.6}
        width={0.13}
        height={0.13}
        fontSize={6}
        onPress={onClose}
      />
      {index > 0 && <ARButton label="Back" x={-0.41} onPress={() => setPage(index - 1)} />}
      {onListen && <ARButton label={speaking ? 'Stop' : 'Listen'} x={0} onPress={onListen} />}
      {index < pages.length - 1 && (
        <ARButton label="Next" x={0.41} onPress={() => setPage(index + 1)} />
      )}
      {onExpand && (
        <ARButton label="Read full screen" x={0} y={-0.6} width={1.16} onPress={onExpand} />
      )}
    </ViroNode>
  );
}

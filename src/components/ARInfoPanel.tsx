import React, { useCallback, useRef, useState } from 'react';
import { ViroBox, ViroMaterials, ViroNode, ViroQuad, ViroText } from '@reactvision/react-viro';
import { stops } from '../content';
import { informationPages } from '../storyPages';
export { storyPages, informationPages } from '../storyPages';
import type { ViroClickState } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import { surfaceCoordinates, type Vector3 } from '../anchorPlacement';

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
  ARInfoButtonTouch: {
    diffuseColor: '#214E45',
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

function ARButton({
  label,
  x,
  y = -0.4,
  width = 0.34,
  height = 0.18,
  fontSize = 5,
  onPress,
  dispatch,
}: {
  label: string;
  x: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  onPress: () => void;
  dispatch: (point: Vector3) => void;
}) {
  const latestPress = useRef(onPress);
  latestPress.current = onPress;
  const latestDispatch = useRef(dispatch);
  latestDispatch.current = dispatch;
  const pressed = useRef(false);
  const lastPress = useRef(-Infinity);
  const mountedAt = useRef(Date.now());
  const press = useCallback((state: ViroClickState, point: Vector3) => {
    if (state === 1 && (!pressed.current || Date.now() - lastPress.current > 600)) {
      pressed.current = true;
      lastPress.current = Date.now();
      if (point) latestDispatch.current(point);
      else latestPress.current();
    } else if (state === 2 || state === 3) {
      pressed.current = false;
    }
  }, []);
  const click = useCallback((point: Vector3) => {
    // Native hit testing may deliver click without clickState. Ignore the
    // opening tap's release and any click following our own touch-down.
    const now = Date.now();
    if (now - mountedAt.current < 500 || now - lastPress.current < 600) return;
    lastPress.current = now;
    pressed.current = false;
    if (point) latestDispatch.current(point);
    else latestPress.current();
  }, []);
  // Require a fresh contact on this button. A release from the tap that
  // opened the card must never activate a newly mounted action underneath it.
  return (
    // Do not attach handlers to this container: its aggregate bounds include
    // the enlarged text texture and can intercept taps on neighboring actions.
    <ViroNode position={[x, y, 0.012]}>
      <ARText
        text={label}
        textClipMode="ClipToBounds"
        width={width - 0.02}
        height={height - 0.02}
        position={[0, 0, 0.15]}
        style={{
          fontFamily: 'Arial',
          color: '#FFFFFF',
          fontSize,
          textAlign: 'center',
          textAlignVertical: 'center',
        }}
        onClickState={press}
        onClick={click}
      />
      {/* The visible button itself is the hit target; no transparent proxy
          or parent bounds can intercept another button's action. */}
      <ViroBox
        width={width + 0.02}
        height={height + 0.02}
        length={0.08}
        position={[0, 0, 0.09]}
        materials={['ARInfoButtonTouch']}
        renderingOrder={11}
        highAccuracyEvents
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
  page: controlledPage,
  onPageChange,
  parentPosition = [0, 0, 0],
  parentRotation = [0, 0, 0],
  parentScale = [1, 1, 1],
}: {
  parentPosition?: Vector3;
  parentRotation?: Vector3;
  parentScale?: Vector3;
  detail: (typeof stops)[number];
  onClose: () => void;
  onListen?: () => void;
  speaking?: boolean;
  rotation?: Vector3;
  onExpand?: () => void;
  position?: Vector3;
  page?: number;
  onPageChange?: (page: number) => void;
}) {
  const [localPage, setLocalPage] = useState(0);
  const page = controlledPage ?? localPage;
  const setPage = (next: number) => {
    setLocalPage(next);
    onPageChange?.(next);
  };
  // Face the user once when opened, then keep the world-space orientation fixed.
  const [lockedRotation] = useState<Vector3>(() => [...rotation]);
  const [lockedPosition] = useState<Vector3>(() => [...position]);
  const pages = informationPages(detail);
  const index = Math.min(page, pages.length - 1);
  // Route by the actual world-space contact, not the native child selected by
  // Viro's overlapping bounds. A hit on Next can never invoke Expand.
  const lockedParent = useRef({
    position: parentPosition,
    rotation: parentRotation,
    scale: parentScale,
  }).current;
  const lastAction = useRef(-Infinity);
  function dispatch(point: Vector3) {
    if (!point.every(Number.isFinite)) return;
    const parent = surfaceCoordinates(point, lockedParent.position, lockedParent.rotation).map(
      (v, i) => v / lockedParent.scale[i],
    ) as Vector3;
    const [x, y] = surfaceCoordinates(parent, lockedPosition, lockedRotation);
    let action: (() => void) | undefined;
    if (Math.abs(x - 0.58) <= 0.085 && Math.abs(y - 0.6) <= 0.085) action = onClose;
    else if (Math.abs(y + 0.4) <= 0.1) {
      if (Math.abs(x) <= 0.18) action = onListen;
      else if (Math.abs(x - 0.41) <= 0.18 && index < pages.length - 1)
        action = () => setPage(index + 1);
      else if (Math.abs(x + 0.41) <= 0.18 && index > 0) action = () => setPage(index - 1);
    } else if (Math.abs(x) <= 0.59 && Math.abs(y + 0.6) <= 0.07) action = onExpand;
    if (!action || Date.now() - lastAction.current < 350) return;
    lastAction.current = Date.now();
    action();
  }

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
        dispatch={dispatch}
        label="×"
        x={0.58}
        y={0.6}
        width={0.13}
        height={0.13}
        fontSize={6}
        onPress={onClose}
      />
      {index > 0 && (
        <ARButton dispatch={dispatch} label="Back" x={-0.41} onPress={() => setPage(index - 1)} />
      )}
      {onListen && (
        <ARButton
          dispatch={dispatch}
          label={speaking ? 'Stop' : 'Listen'}
          x={0}
          onPress={onListen}
        />
      )}
      {index < pages.length - 1 && (
        <ARButton dispatch={dispatch} label="Next" x={0.41} onPress={() => setPage(index + 1)} />
      )}
      {onExpand && (
        <ARButton
          dispatch={dispatch}
          label="Read full screen"
          x={0}
          y={-0.6}
          width={1.16}
          height={0.12}
          onPress={onExpand}
        />
      )}
    </ViroNode>
  );
}

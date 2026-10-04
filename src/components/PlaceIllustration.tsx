import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// A neutral illustration, never presented as a real site or a GPS map.
export default function PlaceIllustration({
  dark = false,
  map = false,
}: {
  dark?: boolean;
  map?: boolean;
}) {
  const ground = dark ? '#172F29' : '#DFE8DF';
  const line = dark ? '#34594B' : '#C4D4C6';
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { backgroundColor: ground }]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 360 280" preserveAspectRatio="xMidYMid slice">
        <Path
          d="M-30 260 Q65 120 135 190 T390 100 M-30 140 Q70 15 205 75 T400 25"
          fill="none"
          stroke={line}
          strokeWidth={30}
        />
        <Path
          d="M-20 230 Q105 260 140 140 T390 110"
          fill="none"
          stroke={dark ? '#52715A' : '#F4F1E9'}
          strokeWidth={18}
        />
        <Circle cx={280} cy={230} r={72} fill={line} opacity={0.35} />
        {!map && (
          <>
            <Rect x={64} y={106} width={82} height={72} rx={16} fill="#E75049" />
            <Path
              d="M95 142 h20 M105 132 v20"
              stroke="#FFFFFF"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <Rect x={219} y={72} width={66} height={58} rx={14} fill="#3485E8" />
            <Path
              d="M242 101 h20 M252 91 v20"
              stroke="#FFFFFF"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <Rect x={128} y={201} width={138} height={44} rx={12} fill="#F4F1E9" />
            <Circle cx={149} cy={223} r={7} fill="#D59A3A" />
            <Path
              d="M168 216 h75 M168 229 h50"
              stroke="#52605A"
              strokeWidth={4}
              strokeLinecap="round"
            />
          </>
        )}
      </Svg>
    </View>
  );
}

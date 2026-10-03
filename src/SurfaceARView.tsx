import React, { useEffect, useState } from 'react';
import { NativeModules, Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import type { PersistentAnchor, TestSpot } from './testLocation';
import type { StopId } from './content';

export type SurfacePhase = 'scanning' | 'choose' | 'placed' | 'limited' | 'lost' | 'unsupported' | 'saving' | 'resolving' | 'anchorError';
export type SurfaceARProps = {
  stopId: StopId;
  testSpot?: TestSpot | null;
  saveRequest?: number;
  onAnchorSaved?: (anchor: PersistentAnchor, savedAt: number) => Promise<void>;
  selected: boolean;
  visible: boolean;
  opacity: number;
  revision: number;
  onSelect: (id: StopId) => void;
  onDismiss: () => void;
  onPhaseChange: (phase: SurfacePhase) => void;
};

// Loading Viro inside Expo Go would try to register missing native views.
// Keep it lazy and only start AR when the custom build includes the native engine.
export const supportsSurfaceAR = Constants.executionEnvironment !== 'storeClient' && (
  Platform.OS === 'ios' ? !!NativeModules.VRTARUtils : Platform.OS === 'android' && !!NativeModules.VRTARSceneNavigatorModule
);

export const persistentAnchorsEnabled = Constants.expoConfig?.extra?.surfaceAnchorProvider === 'reactvision';

export const surfaceInstructions: Record<SurfacePhase, string> = {
  saving: 'Saving this AR spot. Slowly scan the surrounding surface.',
  resolving: 'Finding your saved tile. Scan the same surroundings slowly.',
  anchorError: 'Could not restore or save the exact AR position. Scan more and try again, or place the marker again.',
  scanning: 'Move slowly to scan the ground, a table, or a wall.',
  choose: 'Tap a highlighted surface to place the flat marker.',
  placed: 'Marker placed. Move around it, then tap to open its story.',
  limited: 'Tracking is limited. Move slowly toward a well-lit, textured surface.',
  lost: 'Surface lost. Scan again to place your marker.',
  unsupported: 'Surface AR is unavailable on this device.',
};

export default function SurfaceARView(props: SurfaceARProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const { isARSupportedOnDevice } = require('@reactvision/react-viro') as typeof import('@reactvision/react-viro');
    isARSupportedOnDevice().then(result => {
      if (active) { setSupported(result.isARSupported); if (!result.isARSupported) props.onPhaseChange('unsupported'); }
    }).catch(() => { if (active) { setSupported(false); props.onPhaseChange('unsupported'); } });
    return () => { active = false; };
  }, []);
  if (supported !== true) return <View style={styles.waiting}><Text style={styles.text}>{supported === null ? 'Starting surface tracking…' : 'This device cannot run surface AR. Switch to the demo scene to explore.'}</Text></View>;
  const NativeSurfaceAR = require('./SurfaceARScene').default as React.ComponentType<SurfaceARProps>;
  return <NativeSurfaceAR {...props} />;
}

const styles = StyleSheet.create({ waiting: { ...StyleSheet.absoluteFill, backgroundColor: '#09110E', alignItems: 'center', justifyContent: 'center', padding: 32 }, text: { color: 'white', fontSize: 15, textAlign: 'center', lineHeight: 23 } });

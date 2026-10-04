import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export function arLayoutBudget(height: number, topHeight: number) {
  const available = Math.max(0, height);
  const cameraMinimum = Math.min(120, available * 0.22);
  return {
    topMaximum: available * 0.32,
    cameraMinimum,
    footerMaximum: Math.max(0, Math.min(available * 0.55, available - topHeight - cameraMinimum)),
  };
}

// Camera stays behind the overlay. Flex layout allocates disjoint space to
// the header, interaction area, and scrolling controls, including large text.
export default function ResponsiveAROverlay({
  height,
  top,
  scene,
  footer,
}: {
  height: number;
  top: React.ReactNode;
  scene: React.ReactNode;
  footer: React.ReactNode;
}) {
  const [topHeight, setTopHeight] = useState(0);
  const budget = arLayoutBudget(height, topHeight);
  return (
    <View testID="ar-overlay" style={styles.overlay} pointerEvents="box-none">
      <ScrollView
        testID="ar-top"
        style={[styles.top, { maxHeight: budget.topMaximum }]}
        onLayout={(event) => setTopHeight(event.nativeEvent.layout.height)}
        contentContainerStyle={styles.topContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        pointerEvents="box-none"
      >
        {top}
      </ScrollView>
      <View
        testID="ar-interaction-area"
        pointerEvents="box-none"
        style={[styles.scene, { minHeight: budget.cameraMinimum }]}
      >
        {scene}
      </View>
      <ScrollView
        testID="ar-controls"
        style={[styles.footer, { maxHeight: budget.footerMaximum }]}
        contentContainerStyle={styles.footerContent}
        showsVerticalScrollIndicator
        bounces={false}
        nestedScrollEnabled
      >
        {footer}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1 },
  top: { flexGrow: 0, flexShrink: 0 },
  topContent: { paddingBottom: 8 },
  scene: { flex: 1 },
  footer: { flexGrow: 0, flexShrink: 1, marginHorizontal: 16, marginBottom: 8 },
  footerContent: { gap: 12, paddingBottom: 4 },
});

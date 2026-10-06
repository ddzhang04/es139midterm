import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const slides = [
  {
    image: require('../../assets/welcome-d8381.png'),
    title: 'See places differently',
    caption: 'Objects · places · people',
  },
  {
    image: require('../../assets/site-8349f.png'),
    title: 'Look closer',
    caption: 'Find stories beyond the view.',
  },
  {
    image: require('../../assets/extra-793de.png'),
    title: 'Step into a story',
    caption: 'Explore the past in the present.',
  },
];

export default function WelcomeCarousel({ height }: { height: number }) {
  const scroll = useRef<ScrollView>(null);
  const dimensions = useWindowDimensions();
  const [width, setWidth] = useState(dimensions.width);
  const [active, setActive] = useState(0);
  const [touching, setTouching] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (touching || !foreground || width <= 0) return;
    const timer = setTimeout(() => {
      const next = (active + 1) % slides.length;
      scroll.current?.scrollTo({ x: next * width, animated: true });
      setActive(next);
    }, 4000);
    return () => clearTimeout(timer);
  }, [active, width, touching, foreground]);
  return (
    <View>
      <View style={{ height }} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
        {width > 0 && (
          <ScrollView
            key={width}
            ref={scroll}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onTouchStart={() => setTouching(true)}
            onTouchEnd={() => setTouching(false)}
            onTouchCancel={() => setTouching(false)}
            contentOffset={{ x: active * width, y: 0 }}
            onMomentumScrollEnd={({ nativeEvent }) => {
              setActive(
                Math.max(
                  0,
                  Math.min(slides.length - 1, Math.round(nativeEvent.contentOffset.x / width)),
                ),
              );
            }}
          >
            {slides.map((slide) => (
              <View key={slide.title} style={{ width, height }}>
                <Image
                  source={slide.image}
                  style={{ width, height }}
                  resizeMode="cover"
                  accessibilityLabel={slide.title}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={['transparent', 'rgba(15,32,27,0.85)']}
                  locations={[0.4, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={styles.caption}>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.subtitle}>{slide.caption}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      <View style={styles.pagination}>
        <Text style={styles.hint}>Swipe to explore</Text>
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <Pressable
              key={slide.title}
              accessibilityRole="button"
              accessibilityLabel={`Show photo ${index + 1} of ${slides.length}: ${slide.title}`}
              accessibilityState={{ selected: index === active }}
              onPress={() => {
                setActive(index);
                scroll.current?.scrollTo({ x: index * width, animated: true });
              }}
              style={styles.dotTarget}
            >
              <View style={[styles.dot, index === active && styles.activeDot]} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { position: 'absolute', left: 24, right: 24, bottom: 24, gap: 8 },
  title: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 27, lineHeight: 33 },
  subtitle: { color: '#f4f1e9', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  pagination: {
    paddingLeft: 24,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  hint: { color: '#56655e', fontFamily: 'Inter_400Regular', fontSize: 12 },
  dots: { flexDirection: 'row' },
  dotTarget: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#c4cec7' },
  activeDot: { width: 20, backgroundColor: '#204f46' },
});

import { useState, useCallback, useRef, useEffect } from 'react';
import { ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const AUTO_PLAY_INTERVAL_MS = 10000;

export interface BannerItem {
  id: number;
  image: number;
}

export function useBannerCarousel(width: number, banners: BannerItem[]) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / width);
      setIndex(newIndex);
    },
    [width],
  );

  const goTo = useCallback(
    (newIndex: number) => {
      setIndex(newIndex);
      scrollRef.current?.scrollTo({
        x: newIndex * width,
        animated: true,
      });
    },
    [width],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % banners.length;
        scrollRef.current?.scrollTo({
          x: next * width,
          animated: true,
        });
        return next;
      });
    }, AUTO_PLAY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [width, banners.length]);

  return { index, scrollRef, handleScroll, goTo };
}

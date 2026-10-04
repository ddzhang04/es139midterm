import { useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';

// Native teardown can race with backgrounding. Playback callbacks are already
// invalidated, so teardown failures must not become unhandled rejections.
function silence() {
  try {
    void Promise.resolve(Speech.stop()).catch(() => undefined);
  } catch {
    /* native session already closed */
  }
}

export default function useNarration(active: boolean) {
  const [speaking, setSpeaking] = useState(false);
  const playing = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      silence();
    };
  }, []);
  useEffect(() => {
    if (!active) stop();
  }, [active]);

  function stop() {
    generation.current++;
    playing.current = false;
    setSpeaking(false);
    silence();
  }

  function toggle(text: string) {
    if (playing.current) {
      stop();
      return;
    }
    const operation = ++generation.current;
    playing.current = true;
    setSpeaking(true);
    function finish() {
      if (mounted.current && operation === generation.current) {
        playing.current = false;
        setSpeaking(false);
      }
    }
    try {
      Speech.speak(text, { rate: 0.9, onDone: finish, onStopped: finish, onError: finish });
    } catch {
      finish();
    }
  }

  return { speaking, stop, toggle };
}

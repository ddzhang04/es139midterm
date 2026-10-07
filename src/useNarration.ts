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
  const [error, setError] = useState('');
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
    if (!active || !text.trim()) return;
    if (playing.current) {
      stop();
      return;
    }
    const operation = ++generation.current;
    setError('');
    playing.current = true;
    setSpeaking(true);
    function finish() {
      if (mounted.current && operation === generation.current) {
        playing.current = false;
        setSpeaking(false);
      }
    }
    try {
      Speech.speak(text, {
        rate: 0.9,
        language: 'en-US',
        volume: 1,
        // Give speech its own system-managed session instead of inheriting
        // the AR camera session's audio configuration on iOS.
        useApplicationAudioSession: false,
        onDone: finish,
        onStopped: finish,
        onError: () => {
          if (mounted.current && operation === generation.current)
            setError(
              'Audio could not start. Check your volume and Silent Mode, then tap Listen again.',
            );
          finish();
        },
      });
    } catch {
      setError('Audio could not start. Check your volume and Silent Mode, then tap Listen again.');
      finish();
    }
  }

  return { speaking, error, stop, toggle };
}

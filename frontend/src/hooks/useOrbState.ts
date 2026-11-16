'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ORB_STATES } from '@/lib/constants';

export function useOrbState(initialState: ORB_STATES = ORB_STATES.IDLE) {
  const [state, setState] = useState<ORB_STATES>(initialState);
  const [isInteracting, setIsInteracting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const transitionTo = useCallback(
    (newState: ORB_STATES, delayMs: number = 0) => {
      clearPending();
      if (delayMs <= 0) {
        setState(newState);
      } else {
        timeoutRef.current = setTimeout(() => {
          setState(newState);
          timeoutRef.current = null;
        }, delayMs);
      }
    },
    [clearPending]
  );

  const onPointerEnter = useCallback(() => {
    setIsInteracting(true);
    setState((prev) => (prev === ORB_STATES.IDLE ? ORB_STATES.HOVER : prev));
  }, []);

  const onPointerLeave = useCallback(() => {
    setIsInteracting(false);
    setState((prev) => (prev === ORB_STATES.HOVER ? ORB_STATES.IDLE : prev));
  }, []);

  useEffect(() => {
    return () => clearPending();
  }, [clearPending]);

  return {
    state,
    setState,
    isInteracting,
    transitionTo,
    onPointerEnter,
    onPointerLeave,
  };
}

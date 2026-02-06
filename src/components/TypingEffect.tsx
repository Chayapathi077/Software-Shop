
"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type TypingEffectProps = {
  text: string;
  start: boolean;
  className?: string;
  speed?: number;
};

export function TypingEffect({
  text,
  start,
  className,
  speed = 100,
}: TypingEffectProps) {
  const [displayedText, setDisplayedText] = useState("");
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const charIndexRef = useRef<number>(0);

  useEffect(() => {
    if (start) {
      setDisplayedText("");
      charIndexRef.current = 0;
      lastTimeRef.current = undefined;

      const animate = (time: number) => {
        if (lastTimeRef.current === undefined) {
          lastTimeRef.current = time;
        }

        const deltaTime = time - lastTimeRef.current;

        if (deltaTime > speed) {
          if (charIndexRef.current < text.length) {
            setDisplayedText((prev) => prev + text.charAt(charIndexRef.current));
            charIndexRef.current++;
            lastTimeRef.current = time;
          } else {
            if (requestRef.current) {
              cancelAnimationFrame(requestRef.current);
            }
            return;
          }
        }
        requestRef.current = requestAnimationFrame(animate);
      };

      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [text, speed, start]);

  return <div className={cn(className)}>{displayedText}</div>;
}

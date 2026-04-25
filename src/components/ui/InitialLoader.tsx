"use client";

import React, { useState, useEffect } from "react";
import { CosmicParallaxBg } from "@/components/ui/parallax-cosmic-background";

export default function InitialLoader() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // The gravity animation of the text takes about 3 seconds to complete. 
    // We will show the loader for 4.5 seconds, then fade it out.
    const initiateFade = setTimeout(() => {
      setFade(true);
      const hideLoader = setTimeout(() => setShow(false), 800); // 0.8s fade transition
      return () => clearTimeout(hideLoader);
    }, 4500); 

    return () => clearTimeout(initiateFade);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', 
      inset: 0, 
      zIndex: 99999,
      transition: 'opacity 0.8s ease-in-out', 
      opacity: fade ? 0 : 1, 
      pointerEvents: fade ? 'none' : 'auto',
      backgroundColor: '#090a0f'
    }}>
      <CosmicParallaxBg 
        head="AI INTERVIEW" 
        text="" 
        loop={true}
      />
    </div>
  );
}

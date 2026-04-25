"use client";

import React, { useState, useEffect } from "react";
import AptitudeArcLoader from "./AptitudeArcLoader";

// Module-level flag — lives in memory, NOT sessionStorage.
// ✅ Resets every time the browser is opened / page is hard-refreshed
// ✅ Stays true during client-side navigation (so loader never repeats)
let hasShownLoader = false;

export default function NavigationLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasShownLoader) {
      hasShownLoader = true; // mark as shown for this session
      setVisible(true);      // show the animation
    }
  }, []); // runs once on mount

  if (!visible) return null;

  return <AptitudeArcLoader onComplete={() => setVisible(false)} />;
}

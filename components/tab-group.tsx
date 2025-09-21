"use client";

import React from "react";

interface TabGroupProps {
  children: React.ReactNode;
  isLinked?: boolean;
  direction?: 'horizontal' | 'vertical';
}

export function TabGroup({ children, isLinked = false, direction = 'horizontal' }: TabGroupProps) {
  if (!isLinked) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${direction === 'horizontal' ? 'flex items-center' : 'flex flex-col items-start'}`}>
      {/* Tighter wrapper shape around linked tabs */}
      <div className="absolute inset-0 -m-0.5 rounded-2xl border-2 border-accent/50 bg-accent/10 pointer-events-none shadow-sm" />
      <div className="relative z-10 flex items-center gap-2 p-1">
        {children}
      </div>
    </div>
  );
}
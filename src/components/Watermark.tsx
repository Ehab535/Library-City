import React from 'react';

export const Watermark = ({ text }: { text: string }) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-[100] overflow-hidden opacity-20 flex flex-wrap gap-12 justify-center items-center" style={{ mixBlendMode: 'difference' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="transform -rotate-45 text-2xl font-bold text-[#1a365d] whitespace-nowrap select-none">
          {text}
        </div>
      ))}
    </div>
  );
};

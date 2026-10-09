import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { UserSession } from '../types';

interface WatermarkOverlayProps {
  session: UserSession | null;
  customText?: string;
  className?: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ session, customText, className = '' }) => {
  const isAdmin = session?.role === 'admin' || session?.email === 'khalafehab07@gmail.com';
  if (isAdmin) return null;

  const username = session?.name || session?.username || 'طالب مسجل';
  const sessionId = session?.sessionToken?.substring(0, 8) || 'SEC-89412';
  const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 overflow-hidden select-none flex flex-col justify-between p-6 opacity-25 mix-blend-difference ${className}`}
      aria-hidden="true"
    >
      <div className="flex justify-between items-center text-xs text-[#1a365d]/70 font-mono tracking-widest">
        <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/10 backdrop-blur-sm">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          جلسة محمية #{sessionId}
        </span>
        <span className="bg-black/40 px-2 py-1 rounded border border-white/10 backdrop-blur-sm">
          {now}
        </span>
      </div>

      {/* Repeating Diagonal Watermark Grid */}
      <div className="my-auto grid grid-cols-2 sm:grid-cols-3 gap-12 text-center transform -rotate-12 scale-110">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div key={idx} className="flex flex-col items-center">
            <span className="text-sm font-bold text-[#1a365d]/80 uppercase tracking-wider drop-shadow-md">
              {username}
            </span>
            <span className="text-[10px] text-amber-300 font-medium">
              {customText || 'عرض فقط - التنزيل والنسخ غير متاح'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center text-[10px] text-[#1a365d]/50 font-mono">
        <span>EDU-SECURE-ID: {session?.id || 'LOCAL-GUEST'}</span>
        <span>لا يجوز نقل أو تصوير المحتوى</span>
      </div>
    </div>
  );
};

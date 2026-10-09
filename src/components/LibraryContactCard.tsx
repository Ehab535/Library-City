import React from 'react';
import { Phone, Clock, UserCheck, ShieldCheck, MapPin, MessageCircle } from 'lucide-react';
import { LIBRARY_INFO } from '../constants/contactInfo';

interface LibraryContactCardProps {
  variant?: 'full' | 'compact' | 'banner';
  className?: string;
}

export const LibraryContactCard: React.FC<LibraryContactCardProps> = ({
  variant = 'full',
  className = '',
}) => {
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-[#1a365d] via-[#2a4d7c] to-[#1a365d] text-white p-4 rounded-2xl border border-[#c29c57]/40 shadow-lg ${className}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Working Hours */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#c29c57]/20 text-[#c29c57] rounded-xl border border-[#c29c57]/30 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-[#c29c57] font-semibold">مواعيد العمل بالمكتبة</div>
              <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                {LIBRARY_INFO.workingHours}
              </div>
            </div>
          </div>

          {/* Contact & Owners */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Library Phone */}
            <a
              href={`tel:${LIBRARY_INFO.contactPhone}`}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl border border-white/10 transition text-white font-semibold dir-ltr"
            >
              <Phone className="w-4 h-4 text-[#c29c57]" />
              <span>{LIBRARY_INFO.contactPerson}: {LIBRARY_INFO.contactPhone}</span>
            </a>

            {/* Owners */}
            <div className="flex items-center gap-2 bg-[#c29c57]/15 px-3 py-2 rounded-xl border border-[#c29c57]/30 text-amber-200">
              <UserCheck className="w-4 h-4 text-[#c29c57]" />
              <span className="font-bold text-white">إدارة المكتبة:</span>
              <span className="font-mono text-xs">{LIBRARY_INFO.owners.map(o => `${o.name} (${o.phone})`).join(' | ')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-[#f8f6f0] border border-[#c29c57]/30 p-4 rounded-2xl flex flex-col gap-2 text-xs text-[#1a365d] ${className}`}>
        <div className="flex items-center gap-2 font-bold text-sm text-[#1a365d] border-b border-[#c29c57]/20 pb-2">
          <Clock className="w-4 h-4 text-[#c29c57]" />
          <span>مواعيد العمل والتواصل</span>
        </div>
        <p className="text-slate-600 leading-relaxed font-medium">
          {LIBRARY_INFO.workingHours}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-slate-700">
          <div className="flex items-center gap-1.5 font-bold dir-ltr">
            <Phone className="w-3.5 h-3.5 text-[#c29c57]" />
            <span>{LIBRARY_INFO.contactPerson}: <a href={`tel:${LIBRARY_INFO.contactPhone}`} className="hover:underline text-[#1a365d]">{LIBRARY_INFO.contactPhone}</a></span>
          </div>
          <div className="text-slate-400">|</div>
          <div className="font-semibold text-slate-600">
            Owners: {LIBRARY_INFO.owners.map(o => `${o.name} (${o.phone})`).join(' - ')}
          </div>
        </div>
      </div>
    );
  }

  // Full Variant
  return (
    <div className={`bg-white border border-[#c29c57]/30 rounded-3xl p-6 shadow-md flex flex-col gap-5 ${className}`}>
      {/* Title Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#c29c57]/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#f8f6f0] text-[#1a365d] rounded-2xl border border-[#c29c57]/30">
            <Phone className="w-6 h-6 text-[#c29c57]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#1a365d]">تواصل مع مكتبة المدينة</h3>
            <p className="text-xs text-slate-500">للاستفسارات، تفعيل الاشتراكات الدفع والدعم الفني</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 rounded-full border border-emerald-200 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>خدمة دائمة</span>
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-[#f8f6f0] p-4 rounded-2xl border border-[#c29c57]/20 flex items-start gap-3">
        <Clock className="w-5 h-5 text-[#c29c57] shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-bold text-[#c29c57] mb-1">مواعيد عمل المكتبة:</div>
          <div className="text-xs sm:text-sm font-bold text-[#1a365d] leading-relaxed">
            {LIBRARY_INFO.workingHours}
          </div>
        </div>
      </div>

      {/* Contact Numbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main Contact */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">مسؤول التواصل بالمكتبة</div>
            <div className="text-sm font-bold text-[#1a365d]">{LIBRARY_INFO.contactPerson}</div>
          </div>
          <a
            href={`tel:${LIBRARY_INFO.contactPhone}`}
            className="flex items-center gap-2 bg-[#1a365d] hover:bg-[#152a4a] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Phone className="w-4 h-4 text-[#c29c57]" />
            <span className="dir-ltr">{LIBRARY_INFO.contactPhone}</span>
          </a>
        </div>

        {/* Owners Block */}
        <div className="bg-[#1a365d]/5 p-4 rounded-2xl border border-[#1a365d]/10 flex flex-col gap-2">
          <div className="text-[11px] font-bold text-[#1a365d] flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-[#c29c57]" />
            <span>إدارة المكتبة (Owners)</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {LIBRARY_INFO.owners.map((owner) => (
              <div key={owner.name} className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="font-bold text-[#1a365d]">{owner.name}</span>
                <a href={`tel:${owner.phone}`} className="font-mono text-indigo-700 hover:underline font-semibold dir-ltr">
                  {owner.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

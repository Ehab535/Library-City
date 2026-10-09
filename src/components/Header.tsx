import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  LogOut,
  PlusCircle,
  Search,
  BookOpen,
  Lock,
  GraduationCap,
  SlidersHorizontal,
  Phone,
  Clock,
  UserCheck,
  Bell,
  X,
  CheckCheck,
  Sparkles,
} from 'lucide-react';
import { UserSession, AcademicStructure, NotificationItem } from '../types';
import { ACADEMIC_STRUCTURE } from '../services/storage';
import { LIBRARY_INFO } from '../constants/contactInfo';

interface HeaderProps {
  session: UserSession | null;
  onLogout: () => void;
  onOpenUpload?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenAiAssistant?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedSemester: string;
  setSelectedSemester: (semester: string) => void;
  selectedSubject: string;
  setSelectedSubject: (subject: string) => void;
  contentTypeFilter: 'all' | 'video' | 'pdf' | 'audio';
  setContentTypeFilter: (type: 'all' | 'video' | 'pdf' | 'audio') => void;
  notifications?: NotificationItem[];
  unreadCount?: number;
  onMarkNotificationsRead?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLogout,
  onOpenUpload,
  onOpenAdminPanel,
  onOpenAiAssistant,
  searchQuery,
  setSearchQuery,
  selectedYear,
  setSelectedYear,
  selectedSemester,
  setSelectedSemester,
  selectedSubject,
  setSelectedSubject,
  contentTypeFilter,
  setContentTypeFilter,
  notifications = [],
  unreadCount = 0,
  onMarkNotificationsRead,
}) => {
  const [showNotifModal, setShowNotifModal] = useState(false);
  
  const activeYearData = ACADEMIC_STRUCTURE.find(y => y.year === selectedYear);
  const activeSemesterData = activeYearData?.semesters.find(s => s.semester === selectedSemester);
  const subjects = activeSemesterData?.subjects || [];

  const handleOpenNotifs = () => {
    setShowNotifModal(true);
    if (onMarkNotificationsRead) {
      onMarkNotificationsRead();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#f8f6f0]/90 backdrop-blur-xl border-b border-[#e5dfc9] shadow-md">
      {/* Top Info Banner for Contact & Hours */}
      <div className="bg-[#1a365d] text-white py-1.5 px-4 text-xs font-medium border-b border-[#c29c57]/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#c29c57] shrink-0" />
            <span className="hidden sm:inline font-bold text-[#c29c57]">مواعيد العمل:</span>
            <span>{LIBRARY_INFO.workingHours}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5 dir-ltr font-bold text-[#c29c57]">
              <Phone className="w-3.5 h-3.5" />
              <a href={`tel:${LIBRARY_INFO.contactPhone}`} className="hover:underline">{LIBRARY_INFO.contactPerson}: {LIBRARY_INFO.contactPhone}</a>
            </div>
            <div className="hidden lg:flex items-center gap-1 text-slate-300">
              <UserCheck className="w-3.5 h-3.5 text-[#c29c57]" />
              <span className="font-bold">Owners:</span>
              <span>{LIBRARY_INFO.owners.map(o => `${o.name} (${o.phone})`).join(' | ')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
        
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-14 h-14 bg-[#f8f6f0] rounded-full border-2 border-[#c29c57] shadow-md shrink-0">
               <div className="absolute top-2 text-[#1a365d]">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
               </div>
               <div className="absolute mt-2 flex items-end justify-center text-[#1a365d]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v20"/><path d="M16 2v20"/><path d="M4 10v12"/><path d="M20 10v12"/></svg>
               </div>
               <div className="absolute bottom-2 text-[#c29c57]">
                  <BookOpen className="w-8 h-8" />
               </div>
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-xl sm:text-2xl font-black text-[#1a365d] tracking-tight leading-none mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                مكتبة المدينة
              </h1>
              <h2 className="text-sm sm:text-base font-bold text-[#1a365d] tracking-widest leading-none mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                CITY LIBRARY
              </h2>
              <span className="text-[10px] sm:text-xs font-semibold text-[#c29c57] tracking-widest leading-none" style={{ fontFamily: 'Georgia, serif' }}>
                SINCE 2022
              </span>
            </div>
          </div>

          {/* User Active Session & Actions */}
          {session ? (
            <div className="flex items-center gap-3">
              {/* Single Session Security & Google Drive Status Badge */}
              <div className="hidden md:flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1.5 rounded-xl font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>جلسة موثقة ({session.username})</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mx-0.5"></span>
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  📁 Google Drive متصل
                </span>
              </div>

              {/* AI Assistant Button */}
              {onOpenAiAssistant && (
                <button
                  onClick={onOpenAiAssistant}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#1a365d] to-[#0f2444] hover:from-[#152a4a] hover:to-[#0a182e] text-[#c29c57] border border-[#c29c57]/50 rounded-xl text-xs font-bold shadow-md transition transform hover:scale-105"
                  title="المساعد الأكاديمي الذكي (Gemini AI)"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline">المساعد الذكي</span>
                </button>
              )}

              {/* Notification Bell Button */}
              <button
                onClick={handleOpenNotifs}
                className="relative p-2.5 bg-white hover:bg-amber-50 text-[#1a365d] rounded-xl border border-[#c29c57]/40 shadow-sm transition flex items-center justify-center"
                title="التنبيهات والإشعارات"
              >
                <Bell className="w-5 h-5 text-amber-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Admin actions */}
              {session.role === 'admin' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenAdminPanel}
                    className="px-3.5 py-2 bg-white hover:bg-gray-100 text-[#1a365d] rounded-xl text-xs sm:text-sm font-bold border border-[#c29c57]/30 transition flex items-center gap-1.5 shadow-sm"
                    title="لوحة الإدارة"
                  >
                    <User className="w-4 h-4 text-[#c29c57]" />
                    <span className="hidden sm:inline">لوحة الإدارة</span>
                  </button>
                  {onOpenUpload && (
                    <button
                      onClick={onOpenUpload}
                      className="px-3.5 py-2 bg-[#1a365d] hover:bg-[#152a4a] text-white rounded-xl text-xs sm:text-sm font-bold shadow transition flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4 text-[#c29c57]" />
                      <span className="hidden sm:inline">رفع محتوى</span>
                    </button>
                  )}
                </div>
              )}

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="p-2 sm:px-3 sm:py-2 bg-white hover:bg-rose-950/60 hover:text-rose-300 text-slate-500 rounded-xl border border-[#c29c57]/30 transition flex items-center gap-1.5 text-xs font-medium"
                title="تسجيل الخروج وإنهاء الجلسة"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Search Bar & Filter Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-900">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في الدروس والمستندات..."
              className="w-full bg-white border border-[#c29c57]/30 rounded-xl pr-10 pl-4 py-2 text-xs sm:text-sm text-[#1a365d] placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Type Filter Buttons (الكل / فيديوهات / مستندات / صوتيات) */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setContentTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                contentTypeFilter === 'all'
                  ? 'bg-indigo-600 text-[#1a365d] shadow'
                  : 'bg-white text-slate-500 hover:text-[#1a365d] border border-[#c29c57]/30'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setContentTypeFilter('video')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                contentTypeFilter === 'video'
                  ? 'bg-indigo-600 text-[#1a365d] shadow'
                  : 'bg-white text-slate-500 hover:text-[#1a365d] border border-[#c29c57]/30'
              }`}
            >
              🎬 المحاضرات
            </button>
            <button
              onClick={() => setContentTypeFilter('pdf')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                contentTypeFilter === 'pdf'
                  ? 'bg-purple-600 text-[#1a365d] shadow'
                  : 'bg-white text-slate-500 hover:text-[#1a365d] border border-[#c29c57]/30'
              }`}
            >
              📄 مستندات PDF
            </button>
            <button
              onClick={() => setContentTypeFilter('audio')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                contentTypeFilter === 'audio'
                  ? 'bg-emerald-600 text-[#1a365d] shadow'
                  : 'bg-white text-slate-500 hover:text-[#1a365d] border border-[#c29c57]/30'
              }`}
            >
              🎧 صوتيات
            </button>
          </div>
        </div>

        {/* Academic Structure Filtering */}
        <div className="flex flex-col gap-3 pt-3 border-t border-[#c29c57]/20 dir-rtl">
          {/* Years & Semesters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Academic Years Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-xs font-bold text-[#1a365d] whitespace-nowrap ml-1">الفرقة:</span>
              {ACADEMIC_STRUCTURE.map((yearObj) => {
                const yearLabelMap: Record<string, string> = {
                  'First Year': 'الفرقة الأولى',
                  'Second Year': 'الفرقة الثانية',
                  'Third Year': 'الفرقة الثالثة',
                  'Fourth Year': 'الفرقة الرابعة',
                };
                const displayYear = yearLabelMap[yearObj.year] || yearObj.year;
                const isSelected = selectedYear === yearObj.year;

                return (
                  <button
                    key={yearObj.year}
                    onClick={() => {
                      setSelectedYear(yearObj.year);
                      setSelectedSemester('First Semester');
                      setSelectedSubject('all');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-[#1a365d] text-white border-[#1a365d] shadow-md scale-[1.02]'
                        : 'bg-white text-slate-700 border-[#c29c57]/30 hover:bg-[#f8f6f0] hover:text-[#1a365d]'
                    }`}
                  >
                    {displayYear}
                  </button>
                );
              })}
            </div>

            {/* Semester Selector */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-xs font-bold text-[#1a365d] whitespace-nowrap ml-1">الفصل:</span>
              {activeYearData?.semesters.map((semObj) => {
                const semLabelMap: Record<string, string> = {
                  'First Semester': 'الترم الأول',
                  'Second Semester': 'الترم الثاني',
                };
                const displaySem = semLabelMap[semObj.semester] || semObj.semester;
                const isSelected = selectedSemester === semObj.semester;

                return (
                  <button
                    key={semObj.semester}
                    onClick={() => {
                      setSelectedSemester(semObj.semester);
                      setSelectedSubject('all');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-[#c29c57] text-white border-[#c29c57] shadow-md'
                        : 'bg-white text-slate-600 border-[#c29c57]/20 hover:bg-gray-50'
                    }`}
                  >
                    {displaySem}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subjects Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-bold text-[#1a365d] whitespace-nowrap ml-1">المادة:</span>
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedSubject === 'all'
                  ? 'bg-[#1a365d] text-[#c29c57] border-[#1a365d] shadow'
                  : 'bg-white text-slate-600 border-[#c29c57]/30 hover:bg-gray-50'
              }`}
            >
              جميع المواد
            </button>
            {subjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedSubject === subj
                    ? 'bg-[#1a365d] text-[#c29c57] border-[#1a365d] shadow'
                    : 'bg-white text-slate-600 border-[#c29c57]/30 hover:bg-gray-50'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Notifications Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8f6f0]/85 backdrop-blur-md dir-rtl">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#c29c57]/30 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-[#f8f6f0] border-b border-[#c29c57]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#1a365d]">إشعارات وتنبيهات المكتبة</h3>
                  <p className="text-xs text-slate-500">آخر المستجدات والإعلانات الهامة للطلاب</p>
                </div>
              </div>

              <button
                onClick={() => setShowNotifModal(false)}
                className="p-2 text-slate-500 hover:text-[#1a365d] bg-white rounded-xl border border-[#c29c57]/30 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  لا يوجد إشعارات حالياً. سيتم تنبيهك بأي مستجدات هنا.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition shadow-sm ${
                      n.priority === 1
                        ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                        : 'bg-[#f8f6f0]/60 border-[#c29c57]/30 text-[#1a365d]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1a365d]">{n.title}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            n.priority === 1
                              ? 'bg-rose-600 text-white'
                              : 'bg-sky-600 text-white'
                          }`}
                        >
                          أولوية ({n.priority})
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {n.senderName || 'إدارة المكتبة'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#f8f6f0] border-t border-[#c29c57]/30 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">عدد الإشعارات: {notifications.length}</span>
              <button
                onClick={() => setShowNotifModal(false)}
                className="px-5 py-2 bg-[#1a365d] hover:bg-[#152a4a] text-white font-bold text-xs rounded-xl transition shadow"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
};

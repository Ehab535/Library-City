import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, deleteDoc } from 'firebase/firestore';
import { auth, db, isNativeApp, signOutEverywhere } from './firebase';

import { ContentItem, UserProgress, UserSession, NotificationItem } from './types';
import {
  getActiveSession,
  getContentFileBlob,
  getStoredContentItems,
  getUserProgress,
  saveUserProgress,
  setActiveSession,
  deleteContentItem,
  downloadFileChunksFromFirestore,
  deleteFileChunksFromFirestore,
  saveContentFileBlob,
  clearAllPlatformContent,
} from './services/storage';
import { downloadFileFromGoogleDrive } from './services/drive';

import { Header } from './components/Header';
import { ContentCard } from './components/ContentCard';
import { ProtectedVideoPlayer } from './components/ProtectedVideoPlayer';
import { ProtectedPdfViewer } from './components/ProtectedPdfViewer';
import { LoginModal } from './components/LoginModal';
import { AdminUploadModal } from './components/AdminUploadModal';
import { PresenceTracker } from './components/PresenceTracker';
import { AdminPanel } from './components/AdminPanel';
import { AiAssistantModal } from './components/AiAssistantModal';
import { Watermark } from './components/Watermark';
import { LibraryContactCard } from './components/LibraryContactCard';
import { LIBRARY_INFO } from './constants/contactInfo';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [activeBlobUrl, setActiveBlobUrl] = useState<string | null>(null);
  const [activeBlob, setActiveBlob] = useState<Blob | null>(null);

  const [isDownloadingCloudFile, setIsDownloadingCloudFile] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('First Year');
  const [selectedSemester, setSelectedSemester] = useState('First Semester');
  const [selectedSubject, setSelectedSubject] = useState('all');
  
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'video' | 'pdf' | 'audio'>('all');
  const [userProgress, setUserProgress] = useState<UserProgress>({
    completedIds: [],
    notes: {},
    lastPositions: {},
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [isObscured, setIsObscured] = useState(false);

  const isAdmin = session?.email === 'khalafehab07@gmail.com' || session?.role === 'admin';

  // Listen to Notifications in Real-Time
  useEffect(() => {
    if (!session?.id) return;
    const notifsRef = collection(db, 'notifications');
    let unsubNotifs: (() => void) | null = null;
    try {
      unsubNotifs = onSnapshot(query(notifsRef, orderBy('createdAt', 'desc')), (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as NotificationItem[];
        setNotifications(list);
        const readIds = JSON.parse(localStorage.getItem('edu_read_notifs') || '[]');
        const unread = list.filter(n => !readIds.includes(n.id)).length;
        setUnreadCount(unread);
      }, (err) => {
        console.warn("orderBy notification warning, falling back:", err);
        unsubNotifs = onSnapshot(notifsRef, (snapshot) => {
          const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as NotificationItem[];
          setNotifications(list);
          const readIds = JSON.parse(localStorage.getItem('edu_read_notifs') || '[]');
          const unread = list.filter(n => !readIds.includes(n.id)).length;
          setUnreadCount(unread);
        });
      });
    } catch {
      unsubNotifs = onSnapshot(notifsRef, (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as NotificationItem[];
        setNotifications(list);
      });
    }

    return () => {
      if (unsubNotifs) unsubNotifs();
    };
  }, [session?.id]);

  // Listen to Firestore 'contents' collection for Real-Time Content Sync
  useEffect(() => {
    if (!session?.id) return;
    const contentsRef = collection(db, 'contents');
    const unsubscribeContents = onSnapshot(contentsRef, async (snapshot) => {
      const fsItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ContentItem[];
      
      const isDemoDeleted = localStorage.getItem('edu_demo_deleted');
      const localItems = await getStoredContentItems();
      const localMap = new Map(localItems.map(i => [i.id, i]));

      if (snapshot.empty) {
        const filtered = isDemoDeleted ? localItems.filter(i => i.id !== 'financial-accounting-book') : localItems;
        setContentItems(filtered);
      } else {
        const fsIds = new Set(fsItems.map(i => i.id));
        const unSyncedLocals = localItems.filter(l => !fsIds.has(l.id));

        const merged = [...fsItems, ...unSyncedLocals]
          .filter(item => !(isDemoDeleted && item.id === 'financial-accounting-book'))
          .map(item => ({
            ...item,
            fileDataUrl: item.fileDataUrl || localMap.get(item.id)?.fileDataUrl,
          }));
        setContentItems(merged);
      }
      setIsLoadingContent(false);
    }, (err) => {
      console.error("Contents listener warning:", err);
      setIsLoadingContent(false);
    });

    return () => unsubscribeContents();
  }, [session?.id]);

  const handleMarkNotificationsRead = () => {
    if (notifications.length > 0) {
      const allIds = notifications.map(n => n.id);
      localStorage.setItem('edu_read_notifs', JSON.stringify(allIds));
      setUnreadCount(0);
    }
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    setActiveSession(newSession);
    if (newSession.role === 'student' && newSession.year) {
      setSelectedYear(newSession.year);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setActiveSession(null);
    setSelectedItem(null);
    signOutEverywhere();
  };

  // A saved session is only valid while Firebase still has the user signed in;
  // otherwise every Firestore read would be rejected by the security rules.
  useEffect(() => {
    return auth.onAuthStateChanged((user) => {
      const saved = getActiveSession();
      if (saved && (!user || user.uid !== saved.id)) {
        setSession(null);
        setActiveSession(null);
        setSelectedItem(null);
      }
    });
  }, []);

  // Load session & contents on boot
  useEffect(() => {
    const savedSession = getActiveSession();
    if (savedSession) {
      setSession(savedSession);
      if (savedSession.role === 'student' && savedSession.year) {
        setSelectedYear(savedSession.year);
      }
    }

    const progress = getUserProgress();
    setUserProgress(progress);

    getStoredContentItems().then((items) => {
      setContentItems(items);
      setIsLoadingContent(false);
    });

    // Best-effort anti-screenshot / anti-print listeners
    // Returns true when the guards should stay quiet: nobody is logged in
    // (e.g. the Google account picker stealing focus) or the user is an admin.
    const checkIsAdmin = () => {
      const s = getActiveSession();
      return !s || s.role === 'admin' || s.email === 'khalafehab07@gmail.com';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (checkIsAdmin()) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handleLogout();
        alert('ممنوع الطباعة. تم تسجيل الخروج للحماية.');
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['s', 'S', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        handleLogout();
        alert('ممنوع التقاط الشاشة. تم تسجيل الخروج للحماية.');
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (checkIsAdmin()) return;
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        handleLogout();
        alert('ممنوع التقاط الشاشة. تم تسجيل الخروج للحماية.');
      }
    };

    const handleVisibilityChange = () => {
      if (checkIsAdmin()) return;
      if (document.hidden) {
        setIsObscured(true);
        // In the Android app FLAG_SECURE already blocks screenshots and
        // recording, so leaving the app only hides the content.
        if (isNativeApp) return;
        handleLogout();
        alert('تم ترك الصفحة أو تعتيم الشاشة للحماية. يرجى إعادة تسجيل الدخول.');
      } else {
        setIsObscured(false);
      }
    };

    const handleBlur = () => {
      if (checkIsAdmin()) return;
      setIsObscured(true);
      if (isNativeApp) return;
      handleLogout();
      alert('تم ترك الصفحة أو تعتيم الشاشة للحماية. يرجى إعادة تسجيل الدخول.');
    };
    const handleFocus = () => {
      if (checkIsAdmin()) return;
      setIsObscured(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // When selectedItem changes, retrieve Blob URL locally or download cloud chunks
  useEffect(() => {
    if (!selectedItem) {
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
        setActiveBlobUrl(null);
      }
      setActiveBlob(null);
      setIsDownloadingCloudFile(false);
      setDownloadProgress(0);
      return;
    }

    let isMounted = true;
    setIsDownloadingCloudFile(true);
    setDownloadProgress(10);

    getContentFileBlob(selectedItem.id).then(async (localBlob) => {
      if (!isMounted) return;

      if (localBlob && localBlob.size > 0) {
        setActiveBlob(localBlob);
        if (selectedItem.type !== 'pdf') {
          const url = URL.createObjectURL(localBlob);
          setActiveBlobUrl(url);
        }
        setIsDownloadingCloudFile(false);
      } else {
        const mimeType = selectedItem.type === 'pdf' ? 'application/pdf' : selectedItem.type === 'video' ? 'video/mp4' : 'audio/mpeg';
        let fetchedBlob: Blob | null = null;

        // 1. Firestore chunks: readable only by approved, non-expired members
        setDownloadProgress(25);
        fetchedBlob = await downloadFileChunksFromFirestore(selectedItem.id, mimeType, (pct) => {
          if (isMounted) setDownloadProgress(pct);
        });

        // 2. Drive files are private now, so only an admin's Drive token can read them
        if ((!fetchedBlob || fetchedBlob.size === 0) && selectedItem.driveFileId && isAdmin) {
          setDownloadProgress(35);
          try {
            fetchedBlob = await downloadFileFromGoogleDrive(selectedItem.driveFileId, (pct) => {
              if (isMounted) setDownloadProgress(pct);
            });
            if (fetchedBlob && fetchedBlob.size > 0) {
              await saveContentFileBlob(selectedItem.id, fetchedBlob);
            }
          } catch (gErr) {
            console.warn('Google Drive download fallback:', gErr);
          }
        }

        if (isMounted) {
          if (fetchedBlob && fetchedBlob.size > 0) {
            setActiveBlob(fetchedBlob);
            if (selectedItem.type !== 'pdf') {
              const url = URL.createObjectURL(fetchedBlob);
              setActiveBlobUrl(url);
            }
          }
          setIsDownloadingCloudFile(false);
        }
      }
    }).catch((err) => {
      console.warn("Cloud file download error:", err);
      if (isMounted) setIsDownloadingCloudFile(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedItem]);

  // Monitor user status from Firestore
  useEffect(() => {
    if (!session?.id) return;
    
    let expiryTimestamp: number | null = null;
    let isAdmin = session.email === 'khalafehab07@gmail.com' || session.role === 'admin';
    
    const unsubscribe = onSnapshot(doc(db, 'users', session.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let isExpired = false;
        
        isAdmin = session.email === 'khalafehab07@gmail.com' || data.role === 'admin';

        if (!isAdmin) {
          if (data.subscriptionEndsAt) {
            expiryTimestamp = data.subscriptionEndsAt.seconds * 1000;
            if (expiryTimestamp < Date.now()) {
              isExpired = true;
            }
          } else {
            expiryTimestamp = null;
          }

          if (data.status === 'rejected' || isExpired) {
            handleLogout();
            alert(isExpired ? 'انتهت صلاحية اشتراكك الشهري في المكتبة. يرجى تجديد الاشتراك.' : 'تم إنهاء جلستك من قبل الإدارة.');
          }
        }
      } else if (!isAdmin) {
        handleLogout();
      }
    });

    const interval = setInterval(() => {
      if (!isAdmin && expiryTimestamp && expiryTimestamp < Date.now()) {
        handleLogout();
        alert('انتهت صلاحية اشتراكك الشهري في المكتبة. يرجى تجديد الاشتراك.');
      }
    }, 60000); // Check every minute

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [session?.id, session?.email, session?.role]);

  const handleProgressUpdate = (contentId: string, currentVal: number, isFinished: boolean) => {
    setUserProgress((prev) => {
      const updatedPositions = { ...prev.lastPositions, [contentId]: currentVal };
      let updatedCompleted = [...prev.completedIds];
      if (isFinished && !updatedCompleted.includes(contentId)) {
        updatedCompleted.push(contentId);
      }
      const newProg = {
        ...prev,
        lastPositions: updatedPositions,
        completedIds: updatedCompleted,
      };
      saveUserProgress(newProg);
      return newProg;
    });
  };

  const handleItemUploaded = (newItem: ContentItem) => {
    setContentItems((prev) => {
      const exists = prev.some(i => i.id === newItem.id);
      if (exists) {
        return prev.map(i => i.id === newItem.id ? newItem : i);
      }
      return [newItem, ...prev];
    });
    setSelectedYear(newItem.academicYear);
    setSelectedSemester(newItem.semester);
    setSelectedSubject(newItem.subject);
    setContentTypeFilter('all');
  };

  const handleDeleteItem = async (id: string) => {
    if (id === 'financial-accounting-book') {
      localStorage.setItem('edu_demo_deleted', 'true');
    }
    try {
      await deleteContentItem(id);
      await deleteFileChunksFromFirestore(id).catch(() => {});
      await deleteDoc(doc(db, 'contents', id)).catch(() => {});
    } catch (e) {
      console.warn("Firestore delete note:", e);
    }
    setContentItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
    alert('تم حذف المحتوى بنجاح ولن يظهر مجدداً في المنصة.');
  };

  const handleClearAllContent = async () => {
    await clearAllPlatformContent();
    setContentItems([]);
    setSelectedItem(null);
  };

  const handleEditItem = (item: ContentItem) => {
    setEditingItem(item);
    setShowUploadModal(true);
  };

  // Filtered Content
  const filteredItems = contentItems.filter((item) => {
    const matchesYear = item.academicYear === selectedYear;
    const matchesSemester = item.semester === selectedSemester;
    const matchesSubject = selectedSubject === 'all' || item.subject === selectedSubject;
    const matchesType = contentTypeFilter === 'all' || item.type === contentTypeFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesYear && matchesSemester && matchesSubject && matchesType && matchesSearch;
  });

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8f6f0] text-[#1a365d] font-sans antialiased flex flex-col selection:bg-[#c29c57] selection:text-white">
      
      {/* Obscuring Overlay when window loses focus */}
      {isObscured && (
        <div className="fixed inset-0 z-[99999] bg-[#1a365d] text-white flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <ShieldAlert className="w-16 h-16 text-[#c29c57] mb-4" />
          <h2 className="text-2xl font-bold mb-2">توقف مؤقت للحماية</h2>
          <p className="text-blue-100 max-w-md">
            تم تعتيم الشاشة لحماية المحتوى. يرجى العودة إلى نافذة التطبيق لمتابعة المشاهدة.
          </p>
        </div>
      )}

      {/* 1. Login Authentication Gate - Renders if not logged in */}
      {!session && <LoginModal onLoginSuccess={handleLoginSuccess} activeSession={session} />}

      {/* 2. Top Header Navigation */}
      <Header
        session={session}
        onLogout={handleLogout}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenAdminPanel={() => setShowAdminPanel(true)}
        onOpenAiAssistant={() => setShowAiAssistant(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        contentTypeFilter={contentTypeFilter}
        setContentTypeFilter={setContentTypeFilter}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      />

      {/* 3. Security Warning Strip */}
      {!isAdmin ? (
        <div className="bg-[#1a365d]/5 border-b border-[#c29c57]/30 text-[11px] sm:text-xs text-[#1a365d] font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#c29c57] shrink-0" />
          <span>
            تنبيه أمني: المنصة مخصصة للعرض المباشر فقط. تم تعطيل التنزيل ونسخ النصوص والطباعة لحماية المحتوى.
          </span>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-[11px] sm:text-xs text-emerald-600 font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            وضع المسؤول (الأدمن): صلاحيات كاملة بدون أي قيود أمنية أو علامات مائية.
          </span>
        </div>
      )}

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* VIEW 1: Active Protected Viewer (Video or PDF) */}
        {selectedItem ? (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Back to Catalog Control */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-[#1a365d] rounded-xl border border-[#c29c57]/30 shadow-sm transition flex items-center gap-2 text-xs font-bold"
              >
                <ArrowRight className="w-4 h-4 text-[#c29c57]" />
                <span>العودة لقائمة المواد التعليمية</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <Lock className="w-3.5 h-3.5 text-[#c29c57]" />
                <span>ID: {selectedItem.id}</span>
              </div>
            </div>

            {/* Download Progress Banner for Cloud Files */}
            {isDownloadingCloudFile && (
              <div className="bg-[#1a365d] text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg border border-[#c29c57]/40">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div>
                    <div className="font-bold text-xs sm:text-sm">جاري تهيئة وتنزيل الملف السحابي المحمي ({downloadProgress}%)...</div>
                    <div className="text-[11px] text-amber-200/90">يتم مزامنة المحتوى وتجهيز المشغل بأعلى جودة وثبات.</div>
                  </div>
                </div>
                <div className="w-full sm:w-48 bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-[#c29c57]/40">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-amber-200 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, downloadProgress)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Render Viewer based on content type */}
            <div className="relative overflow-hidden rounded-3xl border border-[#c29c57]/30 bg-white shadow-xl">
              {/* Dynamic Watermark to deter screenshots */}
              {session && !isAdmin && <Watermark text={`${session.name} - ${session.username}`} />}
              
              {selectedItem.type === 'video' || selectedItem.type === 'audio' ? (
                <ProtectedVideoPlayer
                  item={selectedItem}
                  session={session}
                  videoBlobUrl={activeBlobUrl}
                  onProgressUpdate={handleProgressUpdate}
                  initialTime={userProgress.lastPositions[selectedItem.id] || 0}
                />
              ) : (
                <ProtectedPdfViewer
                  item={selectedItem}
                  session={session}
                  pdfBlob={activeBlob}
                  onPageChange={(id, page) => handleProgressUpdate(id, page, false)}
                  initialPage={userProgress.lastPositions[selectedItem.id] || 1}
                />
              )}
            </div>
          </div>
        ) : (
          /* VIEW 2: Content Catalog Grid */
          <div className="flex flex-col gap-6">
            
            {/* Catalog Info & Stats Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#c29c57]/30 shadow-md">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1a365d] mb-1 flex items-center gap-2">
                  <span>المكتبة التعليمية المشفرة</span>
                  <Sparkles className="w-5 h-5 text-[#c29c57]" />
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  تصفح الفيديوهات والملفات التعليمية المتاحة للعرض المباشر في حسابك.
                </p>
              </div>

              {/* Progress Summary Pill */}
              <div className="flex items-center gap-3 bg-[#f8f6f0] p-3 rounded-2xl border border-[#c29c57]/20 text-xs font-medium">
                <div className="p-2 bg-[#e5dfc9] text-[#1a365d] rounded-xl border border-[#c29c57]/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">التقدم في المقررات</div>
                  <div className="text-sm font-bold text-[#1a365d]">
                    تم إنهاء {userProgress.completedIds.length} من أصل {contentItems.length} دروس
                  </div>
                </div>
              </div>
            </div>

            {/* Grid List of Materials */}
            {isLoadingContent ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-3 border-[#c29c57] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">جاري تجهيز المكتبة والمحتوى المحمي...</p>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onSelect={setSelectedItem}
                    onDelete={handleDeleteItem}
                    onEdit={handleEditItem}
                    userRole={session?.role}
                    isCompleted={userProgress.completedIds.includes(item.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800 flex flex-col items-center justify-center gap-3">
                <BookOpen className="w-12 h-12 text-slate-600" />
                <h3 className="text-base font-bold text-slate-300">لا يوجد محتوى يتطابق مع تصفيتك الحالية</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  جرّب تغيير كلمات البحث أو اختيار تصنيف آخر من القائمة في الأعلى.
                </p>
              </div>
            )}
            {/* Library Info & Contact Banner */}
            <LibraryContactCard variant="banner" className="my-2" />
          </div>
        )}
      </main>

      {/* 4. Admin Upload Modal Triggered from Header */}
      {showUploadModal && (
        <AdminUploadModal
          existingItem={editingItem || undefined}
          onClose={() => {
            setShowUploadModal(false);
            setEditingItem(null);
          }}
          onItemUploaded={handleItemUploaded}
        />
      )}

      {/* 5. Admin Panel */}
      {showAdminPanel && (
        <AdminPanel 
          onClose={() => setShowAdminPanel(false)} 
          contentItems={contentItems}
          onAddNewContent={() => setShowUploadModal(true)}
          onEditContent={(item) => {
            setEditingItem(item);
            setShowUploadModal(true);
            setShowAdminPanel(false);
          }}
          onDeleteContent={handleDeleteItem}
          onClearAllContent={handleClearAllContent}
        />
      )}

      <PresenceTracker 
        session={session} 
        currentContentId={selectedItem?.id} 
        currentActivity={selectedItem ? `يعرض ${selectedItem.type === 'pdf' ? 'ملف' : 'فيديو'} ${selectedItem.title}` : 'يتصفح المكتبة'} 
      />

      {/* Floating Action AI Assistant Button */}
      {session && (
        <button
          onClick={() => setShowAiAssistant(true)}
          className="fixed bottom-6 left-6 z-40 bg-gradient-to-r from-[#1a365d] via-slate-900 to-[#0f2444] text-[#c29c57] hover:text-amber-300 border-2 border-[#c29c57]/60 p-3.5 sm:px-5 sm:py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 transition transform hover:scale-105 group active:scale-95"
          title="افتح المساعد الأكاديمي الذكي (Gemini AI)"
        >
          <div className="w-8 h-8 rounded-xl bg-[#c29c57]/20 border border-[#c29c57] flex items-center justify-center text-amber-300 group-hover:rotate-12 transition">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-black text-white leading-tight">المساعد الذكي</span>
            <span className="text-[10px] text-amber-300 font-bold">اسأل الذكاء الاصطناعي</span>
          </div>
        </button>
      )}

      {/* AI Assistant Chat Modal */}
      <AiAssistantModal
        isOpen={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
        academicYear={selectedYear}
        contextSubject={selectedItem?.subject || (selectedSubject !== 'all' ? selectedSubject : undefined)}
      />

      {/* Comprehensive Footer with Library Contact & Owners & Hours */}
      <footer className="mt-auto border-t border-[#c29c57]/30 bg-[#1a365d] text-white py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            {/* Column 1: Library Info */}
            <div className="flex flex-col gap-2">
              <h4 className="text-lg font-black text-[#c29c57] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#c29c57]" />
                مكتبة المدينة CITY LIBRARY
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                منصة المحتوى التعليمي والمستندات المشفرة. نسعى لتقديم أفضل المذكرات والدورات التعليمية.
              </p>
              <div className="text-xs text-amber-200 mt-1 font-semibold">
                التواصل المباشر: {LIBRARY_INFO.contactPerson} (<a href={`tel:${LIBRARY_INFO.contactPhone}`} className="underline font-mono">{LIBRARY_INFO.contactPhone}</a>)
              </div>
            </div>

            {/* Column 2: Working Hours */}
            <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-2xl border border-white/10">
              <h5 className="text-xs font-bold text-[#c29c57] uppercase tracking-wider">مواعيد عمل المكتبة</h5>
              <p className="text-xs text-white font-medium leading-relaxed">
                {LIBRARY_INFO.workingHours}
              </p>
            </div>

            {/* Column 3: Owners */}
            <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-2xl border border-white/10">
              <h5 className="text-xs font-bold text-[#c29c57] uppercase tracking-wider">إدارة المكتبة (Owners)</h5>
              <div className="flex flex-col gap-1.5 text-xs text-slate-200">
                {LIBRARY_INFO.owners.map(o => (
                  <div key={o.name} className="flex items-center justify-between bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="font-bold text-white">{o.name}</span>
                    <a href={`tel:${o.phone}`} className="font-mono text-amber-300 font-semibold dir-ltr hover:underline">{o.phone}</a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              حقوق النشر والطباعة محفوظة لمكتبة المدينة © 2026
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              تواصل: {LIBRARY_INFO.contactPhone} | {LIBRARY_INFO.owners.map(o => `${o.name} ${o.phone}`).join(' | ')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

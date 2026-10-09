import React, { useState, useEffect } from 'react';
import { Users, Activity, Clock, FileVideo, FileText, Database, Layers, LayoutDashboard, Plus, Edit, Trash2, Library, CheckCircle2, XCircle, Key, Bell, Send, AlertCircle, ShieldAlert, ShieldCheck, Crown } from 'lucide-react';
import { collection, query, getDocs, onSnapshot, orderBy, doc, updateDoc, setDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ContentItem, NotificationItem } from '../types';
import { LIBRARY_INFO } from '../constants/contactInfo';

interface AdminPanelProps {
  onClose: () => void;
  contentItems: ContentItem[];
  onAddNewContent: () => void;
  onEditContent: (item: ContentItem) => void;
  onDeleteContent: (id: string) => void;
  onClearAllContent?: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  onClose, 
  contentItems,
  onAddNewContent,
  onEditContent,
  onDeleteContent,
  onClearAllContent
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [presence, setPresence] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'presence' | 'users' | 'codes' | 'content' | 'notifications'>('overview');

  // New notification form states
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifPriority, setNotifPriority] = useState<1 | 2>(1);
  const [notifTargetYear, setNotifTargetYear] = useState('all');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  useEffect(() => {
    // 1. Listen to Users in Real-time
    const usersRef = collection(db, 'users');
    let unsubUsers: (() => void) | null = null;
    try {
      unsubUsers = onSnapshot(query(usersRef, orderBy('createdAt', 'desc')), (snapshot) => {
        setUsers(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
        setIsLoading(false);
      }, (err) => {
        console.warn('orderBy users failed, falling back to simple query:', err);
        unsubUsers = onSnapshot(usersRef, (snapshot) => {
          setUsers(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
          setIsLoading(false);
        });
      });
    } catch {
      unsubUsers = onSnapshot(usersRef, (snapshot) => {
        setUsers(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
        setIsLoading(false);
      });
    }

    // 2. Listen to Codes in Real-time
    const codesRef = collection(db, "codes");
    let unsubCodes: (() => void) | null = null;
    try {
      unsubCodes = onSnapshot(query(codesRef, orderBy("createdAt", "desc")), (snapshot) => {
        setCodes(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      }, (err) => {
        console.warn("orderBy codes failed, falling back:", err);
        unsubCodes = onSnapshot(codesRef, (snapshot) => {
          setCodes(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
        });
      });
    } catch {
      unsubCodes = onSnapshot(codesRef, (snapshot) => {
        setCodes(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      });
    }

    // 3. Listen to Real-time Presence
    const presenceRef = collection(db, 'presence');
    const unsubPresence = onSnapshot(presenceRef, (snapshot) => {
      setPresence(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => console.error("Error listening to presence:", err));

    // 4. Listen to Notifications in Real-time
    const notifsRef = collection(db, 'notifications');
    let unsubNotifs: (() => void) | null = null;
    try {
      unsubNotifs = onSnapshot(query(notifsRef, orderBy('createdAt', 'desc')), (snapshot) => {
        setNotifications(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as NotificationItem[]);
      }, (err) => {
        console.warn("orderBy notifications failed, falling back:", err);
        unsubNotifs = onSnapshot(notifsRef, (snapshot) => {
          setNotifications(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as NotificationItem[]);
        });
      });
    } catch {
      unsubNotifs = onSnapshot(notifsRef, (snapshot) => {
        setNotifications(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as NotificationItem[]);
      });
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubCodes) unsubCodes();
      if (unsubPresence) unsubPresence();
      if (unsubNotifs) unsubNotifs();
    };
  }, []);

  // Handle Generating Subscription Codes
  const handleGenerateCodes = async (count: number, days: number) => {
    try {
      for (let i = 0; i < count; i++) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        await setDoc(doc(db, "codes", code), {
          durationDays: days,
          isUsed: false,
          usedBy: null,
          usedAt: null,
          createdAt: new Date()
        });
      }
      alert(`تم إنشاء ${count} أشتراك/كود بنجاح!`);
    } catch(e: any) {
      console.error(e);
      alert("حدث خطأ أثناء إنشاء الأكواد: " + (e.message || ''));
    }
  };

  // Handle Sending Notification / Announcement
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert('يرجى كتابة عنوان وتفاصيل الإشعار');
      return;
    }

    setIsSendingNotif(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        priority: notifPriority,
        targetYear: notifTargetYear,
        senderName: 'إدارة المكتبة',
        createdAt: serverTimestamp()
      });

      alert('تم إرسال الإشعار لجميع الطلاب بنجاح!');
      setNotifTitle('');
      setNotifMessage('');
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ أثناء إرسال الإشعار: ' + (e.message || ''));
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Handle Delete Notification
  const handleDeleteNotification = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
        alert('تم حذف الإشعار');
      } catch (e: any) {
        console.error(e);
        alert('حدث خطأ أثناء الحذف');
      }
    }
  };

  // Handle User Approval
  const handleApproveUser = async (userId: string, userName: string) => {
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      await updateDoc(doc(db, 'users', userId), { 
        status: 'approved',
        subscriptionEndsAt: expiry
      });
      alert(`تمت الموافقة وتفعيل حساب الطالب: ${userName} (لمدة 30 يوم)`);
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ أثناء الموافقة: ' + (e.message || 'أعد المحاولة'));
    }
  };

  // Handle User Rejection
  const handleRejectUser = async (userId: string) => {
    if (window.confirm('هل أنت متأكد من رفض طلب هذا الطالب؟')) {
      try {
        await updateDoc(doc(db, 'users', userId), { status: 'rejected' });
        alert('تم رفض الطلب');
      } catch (e: any) {
        console.error(e);
        alert('حدث خطأ أثناء الرفض');
      }
    }
  };

  // Handle User Renewal
  const handleRenewUser = async (userId: string, userName: string) => {
    if (window.confirm(`هل تريد تجديد اشتراك الطالب ${userName} لمدة شهر؟`)) {
      try {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        await updateDoc(doc(db, 'users', userId), { 
          status: 'approved',
          subscriptionEndsAt: expiry
        });
        alert(`تم تجديد الاشتراك للطالب: ${userName}`);
      } catch (e: any) {
        console.error(e);
        alert('حدث خطأ أثناء تجديد الاشتراك');
      }
    }
  };

  // Handle User Deletion
  const handleDeleteUser = async (userId: string, userName: string, email?: string) => {
    if (email === 'khalafehab07@gmail.com') {
      alert('لا يمكن حذف حساب الأدمن الأساسي للمنصة.');
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف الحساب نهائياً للمستخدم ${userName}؟`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        alert(`تم حذف حساب ${userName}`);
      } catch (e: any) {
        console.error(e);
        alert('حدث خطأ أثناء حذف الحساب');
      }
    }
  };

  // Handle Grant / Revoke Admin Role
  const handleToggleAdminRole = async (userId: string, currentRole: string, email: string, userName: string) => {
    if (email === 'khalafehab07@gmail.com') {
      alert('حساب khalafehab07@gmail.com هو الأدمن الأساسي والمالك الرئيسي للمنصة ولا يمكن تغيير صلاحياته.');
      return;
    }

    if (currentRole === 'admin') {
      if (window.confirm(`هل أنت متأكد من سحب صلاحيات المسؤول (Admin) من ${userName} وتحويله إلى طالب عادي؟`)) {
        try {
          await updateDoc(doc(db, 'users', userId), { role: 'student' });
          alert(`تم سحب صلاحيات المسؤول من ${userName} وأصبح طالب عادي.`);
        } catch (e: any) {
          console.error(e);
          alert('حدث خطأ أثناء سحب الصلاحيات: ' + (e.message || ''));
        }
      }
    } else {
      if (window.confirm(`هل أنت متأكد من منح صلاحيات المسؤول (Admin) الكاملة للمستخدم ${userName}؟`)) {
        try {
          await updateDoc(doc(db, 'users', userId), { role: 'admin', status: 'approved' });
          alert(`تم ترقية ${userName} إلى مسؤول (Admin) بنجاح! يمكنه الآن دخول لوحة التحكم لإدارة المنصة.`);
        } catch (e: any) {
          console.error(e);
          alert('حدث خطأ أثناء الترقية: ' + (e.message || ''));
        }
      }
    }
  };

  // Handle Content Deletion
  const handleDeleteContentItem = async (itemId: string, itemTitle: string) => {
    if (window.confirm(`هل أنت متأكد من حذف "${itemTitle}"؟`)) {
      try {
        await onDeleteContent(itemId);
      } catch (e: any) {
        console.error(e);
        alert('حدث خطأ أثناء الحذف: ' + (e.message || ''));
      }
    }
  };

  const onlineUsers = presence.filter(p => p.isOnline);
  const totalVideos = contentItems.filter(item => item.type === 'video').length;
  const totalPdfs = contentItems.filter(item => item.type === 'pdf').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8f6f0]/90 backdrop-blur-md">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl border border-[#c29c57]/30 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-[#c29c57]/30 flex flex-wrap items-center justify-between gap-4 bg-[#f8f6f0]">
          <div>
            <h2 className="text-xl font-bold text-[#1a365d] flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-[#c29c57]" />
              لوحة الإدارة والمراقبة - مكتبة المدينة
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              مسؤول التواصل: {LIBRARY_INFO.contactPerson} ({LIBRARY_INFO.contactPhone}) | Owners: {LIBRARY_INFO.owners.map(o => `${o.name} ${o.phone}`).join(' - ')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#c29c57]/30 hover:bg-gray-100 rounded-xl text-slate-700 transition font-bold text-xs shadow-sm"
          >
            إغلاق
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#c29c57]/30 bg-[#f8f6f0]/50 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[120px] p-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${activeTab === 'overview' ? 'border-b-2 border-[#1a365d] text-[#1a365d] bg-white' : 'text-slate-500 hover:bg-gray-50/50'}`}
          >
            <Layers className="w-4 h-4 text-[#c29c57]" />
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('presence')}
            className={`flex-1 min-w-[140px] p-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${activeTab === 'presence' ? 'border-b-2 border-[#1a365d] text-[#1a365d] bg-white' : 'text-slate-500 hover:bg-gray-50/50'}`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            المتصلون ({onlineUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-w-[140px] p-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${activeTab === 'users' ? 'border-b-2 border-[#1a365d] text-[#1a365d] bg-white' : 'text-slate-500 hover:bg-gray-50/50'}`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            المستخدمين ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 min-w-[150px] p-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${activeTab === 'notifications' ? 'border-b-2 border-[#1a365d] text-[#1a365d] bg-white' : 'text-slate-500 hover:bg-gray-50/50'}`}
          >
            <Bell className="w-4 h-4 text-amber-600" />
            الإشعارات ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={`flex-1 min-w-[140px] p-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${activeTab === 'codes' ? 'border-b-2 border-[#1a365d] text-[#1a365d] bg-white' : 'text-slate-500 hover:bg-gray-50/50'}`}
          >
            <Key className="w-4 h-4 text-amber-500" />
            الأكواد والاشتراكات
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 min-w-[140px] p-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${activeTab === 'content' ? 'border-b-2 border-[#1a365d] text-[#1a365d] bg-white' : 'text-slate-500 hover:bg-gray-50/50'}`}
          >
            <Library className="w-4 h-4 text-[#c29c57]" />
            المحتوى ({contentItems.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 dir-rtl bg-[#f8f6f0]">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-[#1a365d] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* 1. Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-[#c29c57]/30 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-black text-[#1a365d]">{users.length}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-500">المستخدمين المسجلين</h3>
                    </div>
                    
                    <div className="bg-white p-5 rounded-2xl border border-[#c29c57]/30 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-black text-emerald-600">{onlineUsers.length}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-500">المتصلون النشطون حالياً</h3>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-[#c29c57]/30 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#c29c57]/20 text-[#1a365d] flex items-center justify-center">
                          <Library className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-black text-[#1a365d]">{contentItems.length}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-500">المحتوى التعليمي المحمي</h3>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-[#c29c57]/30 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                          <Bell className="w-5 h-5" />
                        </div>
                        <span className="text-3xl font-black text-amber-600">{notifications.length}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-500">الإشعارات والتنبيهات</h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#c29c57]/30 p-6 shadow-sm">
                    <h3 className="text-base font-bold text-[#1a365d] mb-4">نشاطات الطلاب المتصلين</h3>
                    {onlineUsers.length > 0 ? (
                      <div className="space-y-3">
                        {onlineUsers.slice(0, 5).map(p => (
                          <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <div>
                                <div className="text-[#1a365d] font-bold text-sm">{p.fullName}</div>
                                <div className="text-xs text-slate-500">{p.currentActivity || 'متصل بالمكتبة'}</div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 font-mono dir-ltr">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(p.lastSeen?.seconds * 1000 || Date.now()).toLocaleTimeString('ar-EG')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                       <p className="text-xs text-slate-400 text-center py-4">لا توجد نشاطات حالياً</p>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Presence Tab */}
              {activeTab === 'presence' && (
                <div className="space-y-3 animate-fade-in">
                  {onlineUsers.length === 0 ? (
                    <div className="text-center p-12 text-slate-500 bg-white rounded-2xl border border-[#c29c57]/30">لا يوجد متصلون حالياً</div>
                  ) : (
                    onlineUsers.map(p => (
                      <div key={p.id} className="bg-white p-4 rounded-2xl border border-[#c29c57]/30 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#1a365d] text-white flex items-center justify-center font-bold text-base">
                             {p.fullName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-[#1a365d] text-sm flex items-center gap-2">
                              {p.fullName}
                              <span className="flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                نشط
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-indigo-600" />
                              {p.currentActivity || 'متصفح للمكتبة'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 flex flex-col items-end gap-1 font-mono dir-ltr">
                          <span>{new Date(p.lastSeen?.seconds * 1000 || Date.now()).toLocaleTimeString('ar-EG')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 3. Users Tab */}
              {activeTab === 'users' && (
                <div className="space-y-3 animate-fade-in">
                  {users.length === 0 ? (
                    <div className="text-center p-12 text-slate-500 bg-white rounded-2xl border border-[#c29c57]/30">لا يوجد مستخدمين مسجلين</div>
                  ) : (
                    users.map(u => (
                      <div key={u.id} className="bg-white p-4 rounded-2xl border border-[#c29c57]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div>
                          <div className="font-bold text-[#1a365d] text-sm flex flex-wrap items-center gap-2">
                            <span>{u.fullName}</span>
                            {u.email === 'khalafehab07@gmail.com' ? (
                              <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm border border-amber-600">
                                <Crown className="w-3 h-3 text-amber-200" /> الأدمن الأساسي (Super Admin)
                              </span>
                            ) : u.role === 'admin' ? (
                              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-300 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-purple-600" /> مسؤول (Admin)
                              </span>
                            ) : null}
                            {u.status === 'pending' && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-300 animate-pulse">قيد الانتظار</span>}
                            {u.status === 'expired' && <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-300">منتهي الصلاحية</span>}
                            {u.status === 'rejected' && <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-300">مرفوض</span>}
                            {u.status === 'approved' && u.role !== 'admin' && <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">مقبول ومفعل</span>}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                            <span>{u.email}</span>
                            {u.year && <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">الفرقة: {u.year}</span>}
                            {u.group && <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">الجروب: {u.group}</span>}
                            {u.subscriptionEndsAt && (
                              <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${
                                u.subscriptionEndsAt.seconds * 1000 < Date.now() ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              }`}>
                                انتهاء: {new Date(u.subscriptionEndsAt.seconds * 1000).toLocaleDateString('ar-EG')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {u.email === 'khalafehab07@gmail.com' ? (
                            <span className="text-xs text-amber-800 font-bold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-300 flex items-center gap-1.5 shadow-sm">
                              <Crown className="w-4 h-4 text-amber-600" /> المالك الرئيسي للمنصة
                            </span>
                          ) : (
                            <>
                              {u.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => handleApproveUser(u.id, u.fullName)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    موافقة وتفعيل (شهر)
                                  </button>
                                  <button 
                                    onClick={() => handleRejectUser(u.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    رفض
                                  </button>
                                </>
                              )}

                              {(u.status === 'approved' || u.status === 'expired') && u.role !== 'admin' && (
                                <button 
                                  onClick={() => handleRenewUser(u.id, u.fullName)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a365d] hover:bg-[#152a4a] text-white text-xs font-bold rounded-xl transition shadow-sm"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-[#c29c57]" />
                                  تجديد الاشتراك (+30 يوم)
                                </button>
                              )}

                              {/* Toggle Admin Role Button */}
                              {u.role === 'admin' ? (
                                <button
                                  onClick={() => handleToggleAdminRole(u.id, u.role, u.email, u.fullName)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition shadow-sm"
                                  title="سحب صلاحية المسؤول"
                                >
                                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                                  إلغاء المسؤول (تنزيل لطالب)
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleAdminRole(u.id, u.role, u.email, u.fullName)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                                  title="منح صلاحية المسؤول الكاملة"
                                >
                                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                                  ترقية إلى مسؤول (Admin)
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteUser(u.id, u.fullName, u.email)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                                title="حذف الحساب"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 4. Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Send New Notification Form */}
                  <form onSubmit={handleSendNotification} className="bg-white p-5 rounded-2xl border border-[#c29c57]/30 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-[#c29c57]/20 pb-3">
                      <h3 className="font-bold text-base text-[#1a365d] flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-600" />
                        إرسال إشعار / تنبيه جديد للطلاب
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">سيظهر الإشعار فوراً في أعلى المنصة</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1a365d] mb-1">عنوان الإشعار</label>
                        <input
                          type="text"
                          value={notifTitle}
                          onChange={(e) => setNotifTitle(e.target.value)}
                          placeholder="مثال: تنبيه هام بخصوص مذكرات المحاسبة"
                          className="w-full bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1a365d] focus:outline-none focus:border-[#1a365d]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1a365d] mb-1">أولوية الإشعار (رقم 1 أو 2)</label>
                        <select
                          value={notifPriority}
                          onChange={(e) => setNotifPriority(Number(e.target.value) as 1 | 2)}
                          className="w-full bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1a365d] focus:outline-none focus:border-[#1a365d]"
                        >
                          <option value={1}>أولوية (1) - عاجل / مهم جداً (شريط أحمر/ذهبي)</option>
                          <option value={2}>أولوية (2) - تنبيه عادي / تحديث محتوى (شريط أزرق)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1a365d] mb-1">تفاصيل الإشعار</label>
                      <textarea
                        value={notifMessage}
                        onChange={(e) => setNotifMessage(e.target.value)}
                        placeholder="أكتب تفاصيل الرسالة هنا... مثال: تم إضافة الفصل الثاني لمادة المحاسبة الحكومية ومواعيد العمل اليوم من 11 صباحاً."
                        rows={3}
                        className="w-full bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1a365d] focus:outline-none focus:border-[#1a365d]"
                        required
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSendingNotif}
                        className="flex items-center gap-2 bg-[#1a365d] hover:bg-[#152a4a] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow transition disabled:opacity-50"
                      >
                        <Send className="w-4 h-4 text-[#c29c57]" />
                        <span>{isSendingNotif ? 'جاري إرسال الإشعار...' : 'إرسال الإشعار للجميع'}</span>
                      </button>
                    </div>
                  </form>

                  {/* List of Sent Notifications */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-[#1a365d]">الإشعارات والتنبيهات النشطة حالياً</h4>
                    {notifications.length === 0 ? (
                      <div className="text-center p-8 text-slate-500 bg-white rounded-2xl border border-[#c29c57]/30 text-xs">لا يوجد إشعارات مرسلة بعد</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="bg-white p-4 rounded-2xl border border-[#c29c57]/30 flex items-start justify-between gap-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${n.priority === 1 ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
                              <Bell className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#1a365d]">{n.title}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${n.priority === 1 ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-sky-100 text-sky-700 border border-sky-300'}`}>
                                  أولوية ({n.priority})
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteNotification(n.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                            title="حذف الإشعار"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 5. Codes Tab */}
              {activeTab === "codes" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-white p-4 rounded-2xl border border-[#c29c57]/30 flex flex-wrap items-end justify-between gap-4 shadow-sm">
                    <div>
                      <h3 className="font-bold text-sm text-[#1a365d]">توليد أكواد الاشتراكات السريعة</h3>
                      <p className="text-xs text-slate-500">أنشئ أكواد ليقوم الطلاب بتفعيل اشتراكاتهم مباشرة</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleGenerateCodes(5, 30)} className="px-3.5 py-2 bg-[#1a365d] hover:bg-[#152a4a] text-white rounded-xl text-xs font-bold transition">5 أكواد (30 يوم)</button>
                      <button onClick={() => handleGenerateCodes(10, 30)} className="px-3.5 py-2 bg-[#1a365d] hover:bg-[#152a4a] text-white rounded-xl text-xs font-bold transition">10 أكواد (30 يوم)</button>
                      <button onClick={() => handleGenerateCodes(5, 90)} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition">5 أكواد (ترم كامل)</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {codes.map(c => (
                      <div key={c.id} className={`p-4 rounded-2xl border ${c.isUsed ? "bg-slate-100 border-slate-200 opacity-60" : "bg-emerald-50 border-emerald-200"} relative`}>
                        <div className="font-mono text-base font-bold text-center tracking-widest text-[#1a365d] bg-white py-2 rounded-xl border border-dashed border-[#c29c57]/50 mb-2">
                          {c.id}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className={`px-2 py-0.5 rounded font-bold ${c.isUsed ? "bg-slate-200 text-slate-600" : "bg-emerald-200 text-emerald-800"}`}>
                            {c.isUsed ? "مستخدم" : "متاح"}
                          </span>
                          <span className="text-slate-600 font-bold">{c.durationDays} يوم</span>
                        </div>
                      </div>
                    ))}
                    {codes.length === 0 && (
                      <div className="col-span-full text-center p-8 text-slate-500 bg-white rounded-2xl border border-[#c29c57]/30 text-xs">لا يوجد أكواد مسجلة</div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#c29c57]/30 shadow-sm">
                    <div>
                      <h3 className="text-[#1a365d] font-bold text-sm">إدارة المكتبة والمستندات</h3>
                      <p className="text-xs text-slate-500">إضافة وتعديل وحذف المحتويات التعليمية المحمية</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {onClearAllContent && (
                        <button
                          onClick={async () => {
                            if (window.confirm('هل أنت متأكد من مسح وحذف جميع المحتويات من المنصة بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) {
                              await onClearAllContent();
                              alert('تم مسح جميع المحتويات من المنصة بنجاح!');
                            }
                          }}
                          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow"
                          title="مسح جميع المحتويات من السحابة والمنصة"
                        >
                          <Trash2 className="w-4 h-4 text-rose-200" />
                          مسح كافة المحتويات
                        </button>
                      )}
                      <button
                        onClick={onAddNewContent}
                        className="flex items-center gap-2 bg-[#1a365d] hover:bg-[#152a4a] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow"
                      >
                        <Plus className="w-4 h-4 text-[#c29c57]" />
                        إضافة محتوى جديد
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {contentItems.length === 0 ? (
                       <div className="text-center p-12 text-slate-500 bg-white rounded-2xl border border-[#c29c57]/30 text-xs">لا يوجد محتوى في المكتبة</div>
                    ) : (
                      contentItems.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-[#c29c57]/30 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.type === 'video' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                              {item.type === 'video' ? <FileVideo className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                            </div>
                            <div>
                              <div className="font-bold text-[#1a365d] text-sm line-clamp-1">{item.title}</div>
                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium">{item.academicYear}</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium">{item.semester}</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium">{item.subject}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onEditContent(item)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition border border-indigo-200"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteContentItem(item.id, item.title)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                              title="حذف المحتوى"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

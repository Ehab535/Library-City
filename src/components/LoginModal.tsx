import React, { useState } from 'react';
import { ShieldCheck, Lock, LogIn, Laptop, AlertCircle, Clock, Key, Phone, UserCheck } from 'lucide-react';
import { UserSession } from '../types';
import { db, signInWithGoogle } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { LibraryContactCard } from './LibraryContactCard';
import { LIBRARY_INFO } from '../constants/contactInfo';

interface LoginModalProps {
  onLoginSuccess: (session: UserSession) => void;
  activeSession: UserSession | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, activeSession }) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [arabicName, setArabicName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [authUser, setAuthUser] = useState<any>(null);
  const [subscriptionCode, setSubscriptionCode] = useState('');

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await signInWithGoogle();
      // Needed by the subscription-code form for returning (pending/expired) users too
      setAuthUser(user);

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        let currentStatus = userData.status;
        const isAdmin = user.email === 'khalafehab07@gmail.com' || userData.role === 'admin';
        
        if (!isAdmin && userData.subscriptionEndsAt && userData.subscriptionEndsAt.seconds * 1000 < Date.now()) {
           currentStatus = 'expired';
        }

        if (isAdmin) {
          proceedWithLogin(user.uid, user.email || '', userData.fullName, userData.role, 'approved', userData.year, userData.group);
        } else if (currentStatus === 'pending') {
          setIsPending(true);
        } else if (currentStatus === 'rejected') {
          setIsRejected(true);
        } else if (currentStatus === 'expired') {
          setIsExpired(true);
        } else {
          proceedWithLogin(user.uid, user.email || '', userData.fullName, userData.role, currentStatus, userData.year, userData.group);
        }
      } else {
        setAuthUser(user);
        setNeedsName(true);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'حدث خطأ أثناء تسجيل الدخول عبر جوجل');
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriptionCode.trim()) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      if (!authUser) {
        throw new Error('يرجى تسجيل الدخول بحساب جوجل أولاً');
      }
      const codeRef = doc(db, 'codes', subscriptionCode.trim().toUpperCase());
      const codeSnap = await getDoc(codeRef);
      
      if (!codeSnap.exists()) {
        throw new Error('كود الاشتراك غير صحيح');
      }
      
      const codeData = codeSnap.data();
      if (codeData.isUsed) {
        throw new Error('تم استخدام هذا الكود من قبل');
      }
      
      const durationDays = codeData.durationDays || 30;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + durationDays);
      
      // Both writes go in one batch: the Firestore rules only let a student
      // approve themselves when the same batch marks an unused code as theirs.
      const batch = writeBatch(db);
      batch.update(codeRef, {
        isUsed: true,
        usedBy: authUser.uid,
        usedAt: serverTimestamp()
      });
      batch.update(doc(db, 'users', authUser.uid), {
        status: 'approved',
        subscriptionEndsAt: expiry,
        redeemedCode: codeRef.id
      });
      await batch.commit();

      const userSnap = await getDoc(doc(db, 'users', authUser.uid));
      const userData = userSnap.data();
      proceedWithLogin(authUser.uid, authUser.email || '', userData?.fullName, userData?.role, 'approved', userData?.year, userData?.group);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'حدث خطأ أثناء تفعيل الكود');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const nameParts = arabicName.trim().split(/\s+/);
    if (nameParts.length < 4) {
      setErrorMessage('يرجى كتابة الاسم رباعي على الأقل');
      return;
    }
    
    if (!/^[\u0600-\u06FF\s]+$/.test(arabicName)) {
      setErrorMessage('يرجى كتابة الاسم باللغة العربية فقط');
      return;
    }

    if (!academicYear.trim()) {
      setErrorMessage('يرجى إدخال الفرقة');
      return;
    }

    if (!groupNumber.trim()) {
      setErrorMessage('يرجى إدخال رقم الجروب');
      return;
    }

    setIsLoading(true);
    try {
      const isAdmin = authUser.email === 'khalafehab07@gmail.com';
      const role = isAdmin ? 'admin' : 'student';
      const initialStatus = isAdmin ? 'approved' : 'pending';
      
      await setDoc(doc(db, 'users', authUser.uid), {
        fullName: arabicName.trim(),
        email: authUser.email,
        role: role,
        status: initialStatus,
        year: academicYear.trim(),
        group: groupNumber.trim(),
        createdAt: serverTimestamp()
      });

      if (initialStatus === 'pending') {
        setNeedsName(false);
        setIsPending(true);
      } else {
        proceedWithLogin(authUser.uid, authUser.email || '', arabicName.trim(), role, initialStatus, academicYear.trim(), groupNumber.trim());
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const proceedWithLogin = (uid: string, email: string, name: string, role: string, status?: string, year?: string, group?: string) => {
    const sessionToken = `SEC-TOKEN-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now()}`;
    const newSession: UserSession = {
      id: uid,
      username: email || 'مستخدم',
      name: name,
      role: role as any,
      loginTime: Date.now(),
      sessionToken,
      activeDevice: navigator.userAgent.includes('Mobile') ? 'هاتف محمول' : 'جهاز متصفح محمي',
      status,
      year,
      group
    };

    onLoginSuccess(newSession);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8f6f0]/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#c29c57]/30 shadow-2xl overflow-hidden text-[#1a365d] flex flex-col animate-fade-in">
        
        {/* Header */}
        <div className="bg-[#1a365d] p-6 sm:p-8 text-center relative border-b border-[#c29c57]/30">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 text-[#c29c57] border border-[#c29c57]/50 mb-4 shadow-inner">
            <Lock className="w-8 h-8 text-[#c29c57]" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1a365d] mb-1">
            تسجيل الدخول - مكتبة المدينة
          </h1>
          <p className="text-xs text-blue-200/80 max-w-xs mx-auto">
            منصة محمية بحساب أحادي مشفر - للعرض فقط دون إمكانية التحميل
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-500/50 text-emerald-300 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>نظام الجلسة الواحدة النشطة مفعل</span>
          </div>
        </div>

        {/* Login Action */}
        <div className="p-6 sm:p-8 flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isPending ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1a365d]">حسابك قيد المراجعة</h3>
              <p className="text-sm text-slate-500 text-center max-w-sm">
                لقد تم تسجيل بياناتك بنجاح، يرجى الانتظار حتى يقوم المسؤول بمراجعة حسابك والموافقة عليه لتتمكن من الدخول إلى المنصة.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2.5 bg-[#1a365d] hover:bg-[#152a4a] text-white rounded-xl text-sm transition font-bold"
              >
                تحديث الصفحة
              </button>
              <div className="w-full h-px bg-slate-200 my-2"></div>
              <form onSubmit={handleCodeSubmit} className="w-full flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-700 text-right">أو أدخل كود الاشتراك للتفعيل الفوري</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subscriptionCode}
                    onChange={(e) => setSubscriptionCode(e.target.value.toUpperCase())}
                    placeholder="كود الاشتراك (مثال: ABCD123)"
                    className="flex-1 bg-white border border-[#c29c57]/30 rounded-xl p-3 text-center tracking-widest font-mono font-bold text-[#1a365d] focus:outline-none focus:border-[#1a365d]"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !subscriptionCode.trim()}
                    className="px-4 py-3 bg-[#c29c57] hover:bg-[#a17e43] disabled:opacity-50 text-white rounded-xl text-sm transition font-bold whitespace-nowrap flex items-center justify-center"
                  >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "تفعيل"}
                  </button>
                </div>
              </form>

              <div className="w-full h-px bg-slate-200 my-2"></div>
              <form onSubmit={handleCodeSubmit} className="w-full flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-700 text-right">أو أدخل كود الاشتراك للتفعيل الفوري</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subscriptionCode}
                    onChange={(e) => setSubscriptionCode(e.target.value.toUpperCase())}
                    placeholder="كود الاشتراك (مثال: ABCD123)"
                    className="flex-1 bg-white border border-[#c29c57]/30 rounded-xl p-3 text-center tracking-widest font-mono font-bold text-[#1a365d] focus:outline-none focus:border-[#1a365d]"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !subscriptionCode.trim()}
                    className="px-4 py-3 bg-[#c29c57] hover:bg-[#a17e43] disabled:opacity-50 text-white rounded-xl text-sm transition font-bold whitespace-nowrap flex items-center justify-center"
                  >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "تفعيل"}
                  </button>
                </div>
              </form>

            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1a365d]">انتهت صلاحية اشتراكك</h3>
              <p className="text-sm text-slate-500 text-center max-w-sm">
                عفواً، لقد انتهت صلاحية اشتراكك الشهري في المكتبة. يرجى تجديد الاشتراك مع الإدارة لاستعادة الوصول للمحتوى.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2.5 bg-[#1a365d] hover:bg-[#152a4a] text-white rounded-xl text-sm transition font-bold"
              >
                تحديث الصفحة
              </button>
              <div className="w-full h-px bg-slate-200 my-2"></div>
              <form onSubmit={handleCodeSubmit} className="w-full flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-700 text-right">أو أدخل كود اشتراك جديد للتجديد الفوري</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subscriptionCode}
                    onChange={(e) => setSubscriptionCode(e.target.value.toUpperCase())}
                    placeholder="كود الاشتراك (مثال: ABCD123)"
                    className="flex-1 bg-white border border-[#c29c57]/30 rounded-xl p-3 text-center tracking-widest font-mono font-bold text-[#1a365d] focus:outline-none focus:border-[#1a365d]"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !subscriptionCode.trim()}
                    className="px-4 py-3 bg-[#c29c57] hover:bg-[#a17e43] disabled:opacity-50 text-white rounded-xl text-sm transition font-bold whitespace-nowrap flex items-center justify-center"
                  >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "تفعيل"}
                  </button>
                </div>
              </form>
            </div>
          ) : isRejected ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1a365d]">عفواً، تم رفض طلبك</h3>
              <p className="text-sm text-slate-500 text-center max-w-sm">
                لم يتم الموافقة على طلب انضمامك للمنصة. يرجى مراجعة الإدارة لمزيد من التفاصيل.
              </p>
            </div>
          ) : needsName ? (
            <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-[11px] text-blue-800">
                <p>تم ربط حسابك بنجاح. يرجى إكمال البيانات التالية لاستكمال التسجيل.</p>
              </div>
              <input
                type="text"
                placeholder="الاسم الرباعي (باللغة العربية)"
                value={arabicName}
                onChange={(e) => setArabicName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#c29c57]/30 rounded-xl text-[#1a365d] focus:outline-none focus:border-[#c29c57] focus:ring-1 focus:ring-[#c29c57] transition dir-rtl text-sm"
                required
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="الفرقة الدراسية"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-1/2 px-4 py-3 bg-white border border-[#c29c57]/30 rounded-xl text-[#1a365d] focus:outline-none focus:border-[#c29c57] focus:ring-1 focus:ring-[#c29c57] transition dir-rtl text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="رقم الجروب"
                  value={groupNumber}
                  onChange={(e) => setGroupNumber(e.target.value)}
                  className="w-1/2 px-4 py-3 bg-white border border-[#c29c57]/30 rounded-xl text-[#1a365d] focus:outline-none focus:border-[#c29c57] focus:ring-1 focus:ring-[#c29c57] transition dir-rtl text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-[#1a365d] hover:bg-[#152a4a] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-3 text-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>إرسال طلب التسجيل</span>
                )}
              </button>
            </form>
          ) : (
            <>
              {/* Protection Notice */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <Laptop className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p>
                  بمجرد فتح الحساب، لن يسمح بفتح الجلسة من أي متصفح آخر في نفس الوقت، وسيتم حظر جميع خيارات التنزيل لحماية حقوق الفيديوهات والـ PDFs.
                </p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 bg-white border border-[#c29c57]/30 hover:bg-gray-50 text-[#1a365d] font-bold rounded-xl shadow-sm hover:shadow-md transition flex items-center justify-center gap-3 text-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#1a365d] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    <span>تسجيل الدخول باستخدام جوجل</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Library Contact & Hours Card */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <LibraryContactCard variant="compact" />
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-gray-50 text-center text-[10px] text-slate-500 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <span>مكتبة المدينة | حماية مشفرة 256-bit</span>
          <span className="font-semibold text-slate-700">تواصل: {LIBRARY_INFO.contactPhone}</span>
        </div>
      </div>
    </div>
  );
};

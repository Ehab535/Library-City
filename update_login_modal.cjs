const fs = require('fs');
let code = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');

code = code.replace("import { ShieldCheck, Lock, LogIn, Laptop, AlertCircle, Clock }", "import { ShieldCheck, Lock, LogIn, Laptop, AlertCircle, Clock, Key }");
code = code.replace("import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';", "import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';");
code = code.replace("const [authUser, setAuthUser] = useState<any>(null);", "const [authUser, setAuthUser] = useState<any>(null);\n  const [subscriptionCode, setSubscriptionCode] = useState('');");

const handleCodeSubmit = `
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriptionCode.trim()) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
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
      
      await updateDoc(codeRef, {
        isUsed: true,
        usedBy: authUser?.uid || 'Unknown',
        usedAt: serverTimestamp()
      });
      
      if (authUser) {
        await updateDoc(doc(db, 'users', authUser.uid), {
          status: 'approved',
          subscriptionEndsAt: expiry
        });
        
        const userSnap = await getDoc(doc(db, 'users', authUser.uid));
        const userData = userSnap.data();
        proceedWithLogin(authUser.uid, authUser.email || '', userData?.fullName, userData?.role, 'approved', userData?.year, userData?.group);
      }
      
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'حدث خطأ أثناء تفعيل الكود');
    } finally {
      setIsLoading(false);
    }
  };
`;

code = code.replace("const handleNameSubmit = async (e: React.FormEvent) => {", handleCodeSubmit + "\n  const handleNameSubmit = async (e: React.FormEvent) => {");

const codeInputHtml = `
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
`;

code = code.replace(
  `<button\n                onClick={() => window.location.reload()}\n                className="mt-4 px-6 py-2.5 bg-[#1a365d] hover:bg-[#152a4a] text-white rounded-xl text-sm transition font-bold"\n              >\n                تحديث الصفحة\n              </button>`,
  `<button\n                onClick={() => window.location.reload()}\n                className="mt-4 px-6 py-2.5 bg-[#1a365d] hover:bg-[#152a4a] text-white rounded-xl text-sm transition font-bold"\n              >\n                تحديث الصفحة\n              </button>` + codeInputHtml
);

code = code.replace(
  `<button\n                onClick={() => window.location.reload()}\n                className="mt-4 px-6 py-2.5 bg-[#1a365d] hover:bg-[#152a4a] text-white rounded-xl text-sm transition font-bold"\n              >\n                تحديث الصفحة\n              </button>`,
  `<button\n                onClick={() => window.location.reload()}\n                className="mt-4 px-6 py-2.5 bg-[#1a365d] hover:bg-[#152a4a] text-white rounded-xl text-sm transition font-bold"\n              >\n                تحديث الصفحة\n              </button>` + codeInputHtml
);


fs.writeFileSync('src/components/LoginModal.tsx', code);

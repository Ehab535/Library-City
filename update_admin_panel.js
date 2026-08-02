const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.replace("import { Users, Activity", "import { Users, Activity, Key");
code = code.replace("const [users, setUsers] = useState<any[]>([]);", "const [users, setUsers] = useState<any[]>([]);\n  const [codes, setCodes] = useState<any[]>([]);");
code = code.replace("const [activeTab, setActiveTab] = useState<'overview' | 'presence' | 'users' | 'content'>('overview');", "const [activeTab, setActiveTab] = useState<'overview' | 'presence' | 'users' | 'codes' | 'content'>('overview');");

const fetchCodesStr = `
    const fetchCodes = async () => {
      try {
        const codesRef = collection(db, 'codes');
        const q = query(codesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const codesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCodes(codesData);
      } catch (error) {
        console.error('Error fetching codes:', error);
      }
    };
    fetchCodes();
`;
code = code.replace("fetchUsers();", "fetchUsers();\n" + fetchCodesStr);

const tabsHtml = `
          <button
            onClick={() => setActiveTab('users')}
            className={\`flex-1 min-w-[150px] p-4 font-medium flex items-center justify-center gap-2 transition \${activeTab === 'users' ? 'border-b-2 border-indigo-500 text-indigo-400 bg-indigo-950/20' : 'text-slate-500 hover:bg-gray-50/50'}\`}
          >
            <Users className="w-5 h-5" />
            إدارة المشتركين ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={\`flex-1 min-w-[150px] p-4 font-medium flex items-center justify-center gap-2 transition \${activeTab === 'codes' ? 'border-b-2 border-indigo-500 text-indigo-400 bg-indigo-950/20' : 'text-slate-500 hover:bg-gray-50/50'}\`}
          >
            <Key className="w-5 h-5" />
            الأكواد والاشتراكات
          </button>
`;

code = code.replace(/<button\s+onClick=\{\(\) => setActiveTab\('users'\)\}[\s\S]*?<\/button>/, tabsHtml);

const generateCodeFn = `
  const handleGenerateCodes = async (count: number, days: number) => {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      for (let i = 0; i < count; i++) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        await setDoc(doc(db, 'codes', code), {
          durationDays: days,
          isUsed: false,
          usedBy: null,
          usedAt: null,
          createdAt: new Date()
        });
      }
      alert('تم إنشاء الأكواد بنجاح');
      // Refetch
      const codesRef = collection(db, 'codes');
      const q = query(codesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const codesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCodes(codesData);
    } catch(e) {
      console.error(e);
      alert('حدث خطأ أثناء إنشاء الأكواد');
    }
  };
`;

code = code.replace("const onlineUsers = presence.filter(p => p.isOnline);", generateCodeFn + "\n  const onlineUsers = presence.filter(p => p.isOnline);");

const codesTabHtml = `
              {activeTab === 'codes' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-white p-4 rounded-2xl border border-[#c29c57]/30 flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="font-bold text-[#1a365d] mb-2">إنشاء أكواد جديدة</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleGenerateCodes(5, 30)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition">5 أكواد (30 يوم)</button>
                        <button onClick={() => handleGenerateCodes(10, 30)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition">10 أكواد (30 يوم)</button>
                        <button onClick={() => handleGenerateCodes(5, 90)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition">5 أكواد (ترم كامل)</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {codes.map(c => (
                      <div key={c.id} className={\`p-4 rounded-xl border \${c.isUsed ? 'bg-gray-100 border-gray-200' : 'bg-emerald-50 border-emerald-200'} relative\`}>
                        <div className="font-mono text-lg font-bold text-center tracking-widest text-[#1a365d] bg-white py-2 rounded-lg border border-dashed border-[#c29c57]/50 mb-2">
                          {c.id}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className={\`px-2 py-0.5 rounded-md \${c.isUsed ? 'bg-gray-200 text-gray-600' : 'bg-emerald-200 text-emerald-700'}\`}>
                            {c.isUsed ? 'مستخدم' : 'متاح'}
                          </span>
                          <span className="text-slate-500">{c.durationDays} يوم</span>
                        </div>
                        {c.isUsed && c.usedBy && (
                          <div className="text-[10px] text-slate-400 mt-2 text-center truncate">
                            مستخدم بواسطة: {c.usedBy}
                          </div>
                        )}
                      </div>
                    ))}
                    {codes.length === 0 && (
                      <div className="col-span-full text-center p-8 text-slate-500 bg-white rounded-2xl border border-[#c29c57]/30">لا يوجد أكواد مسجلة</div>
                    )}
                  </div>
                </div>
              )}
`;

code = code.replace("{activeTab === 'users' && (", codesTabHtml + "\n              {activeTab === 'users' && (");

fs.writeFileSync('src/components/AdminPanel.tsx', code);

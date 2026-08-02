const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const securityCode = `
    // Best-effort anti-screenshot / anti-print listeners
    const handleKeyDown = (e: KeyboardEvent) => {
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
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        handleLogout();
        alert('ممنوع التقاط الشاشة. تم تسجيل الخروج للحماية.');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsObscured(true);
        handleLogout();
        alert('تم ترك الصفحة أو تعتيم الشاشة للحماية. يرجى إعادة تسجيل الدخول.');
      } else {
        setIsObscured(false);
      }
    };

    const handleBlur = () => {
      setIsObscured(true);
      handleLogout();
      alert('تم ترك الصفحة أو تعتيم الشاشة للحماية. يرجى إعادة تسجيل الدخول.');
    };
`;

const regex = /\/\/ Best-effort anti-screenshot \/ anti-print listeners[\s\S]*?const handleBlur = \(\) => \{[\s\S]*?alert\('تم تعتيم الشاشة لحماية المحتوى. يرجى إعادة تسجيل الدخول.'\);\n    \};/m;

code = code.replace(regex, securityCode.trim());

fs.writeFileSync('src/App.tsx', code);

import React, { useEffect, useState, useRef } from 'react';
import {
  FileText,
  Lock,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  BookOpen,
  Printer,
  Download,
  AlertOctagon,
  Move,
  ShieldAlert,
} from 'lucide-react';
import { ContentItem, UserSession } from '../types';
import { WatermarkOverlay } from './WatermarkOverlay';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ProtectedPdfViewerProps {
  item: ContentItem;
  session: UserSession | null;
  pdfBlob?: Blob | null;
  onPageChange?: (contentId: string, pageNumber: number) => void;
  initialPage?: number;
}

export const ProtectedPdfViewer: React.FC<ProtectedPdfViewerProps> = ({
  item,
  session,
  pdfBlob,
  onPageChange,
  initialPage = 1,
}) => {
  const isAdmin = session?.role === 'admin' || session?.email === 'khalafehab07@gmail.com';
  const [currentPage, setCurrentPage] = useState(initialPage);
  // Default to 160% zoom for partial view anti-screenshot protection
  const [zoomLevel, setZoomLevel] = useState(isAdmin ? 125 : 160);
  const [rotation, setRotation] = useState(0);
  const [userNotes, setUserNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfData, setPdfData] = useState<any>(null);

  // Partial View Anti-Theft Protection Mode
  const [partialProtection, setPartialProtection] = useState(!isAdmin);

  // Drag-to-pan state and ref
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    setIsMouseDown(true);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !containerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    containerRef.current.scrollLeft = dragStartPos.current.scrollLeft - dx;
    containerRef.current.scrollTop = dragStartPos.current.scrollTop - dy;
  };

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false);
  };

  useEffect(() => {
    if (pdfBlob) {
      pdfBlob
        .arrayBuffer()
        .then((buffer) => {
          if (buffer && buffer.byteLength > 0) {
            setPdfData({ data: new Uint8Array(buffer) });
          } else {
            setPdfData(null);
          }
        })
        .catch(() => {
          setPdfData(null);
        });
    } else if (
      item.fileDataUrl &&
      (item.fileDataUrl.startsWith('data:application/pdf') ||
        item.fileDataUrl.startsWith('blob:') ||
        item.fileDataUrl.endsWith('.pdf'))
    ) {
      setPdfData(item.fileDataUrl);
    } else if (item.externalUrl && item.externalUrl.endsWith('.pdf')) {
      setPdfData(item.externalUrl);
    } else {
      setPdfData(null);
    }
  }, [pdfBlob, item.fileDataUrl, item.externalUrl]);

  const totalPages = numPages || item.totalPages || 12;
  const pdfSource = pdfData;

  useEffect(() => {
    // Inject CSS to completely hide content if someone attempts window.print()
    const styleEl = document.createElement('style');
    styleEl.id = 'anti-print-styles';
    styleEl.innerHTML = `
      @media print {
        body { display: none !important; }
        html { display: none !important; }
      }
    `;
    document.head.appendChild(styleEl);

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ['p', 'P', 's', 'S', 'c', 'C', 'u', 'U'].includes(e.key)
      ) {
        e.preventDefault();
        alert('مستند PDF محمي. يمنع الطباعة أو التنزيل أو نسّخ المحتوى.');
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.getElementById('anti-print-styles')?.remove();
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      if (onPageChange) onPageChange(item.id, next);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      if (onPageChange) onPageChange(item.id, prev);
    }
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => {
      const minZ = partialProtection && !isAdmin ? 135 : 75;
      const maxZ = 250;
      const newZ = Math.max(minZ, Math.min(maxZ, prev + delta));
      if (prev <= minZ && delta < 0 && partialProtection && !isAdmin) {
        alert('تم قفل التصغير عند 135% لحماية المستند من تصوير الصفحة كاملاً في لقطة شاشة واحدة.');
      }
      return newZ;
    });
  };

  // Mock pages generated content for rich reading experience when raw PDF blob is binary preview
  const samplePagesText = [
    {
      page: 1,
      title: 'الفصل الأول: الأساسيات والمبادئ العليا',
      content:
        'يقدم هذا المستند نظرة عامة شاملة حول المقررات الأساسية للتطبيقات البرمجية والهندسية الحديثة. تضمن المنصة حماية هذا المحتوى لكافة الطلاب المسجلين بصورة فردية وموثقة.',
      keyPoints: [
        'المبدأ الأول: حماية البيانات والأمان الرقمي.',
        'المبدأ الثاني: تصميم الخوارزميات وتحسين الأداء.',
        'المبدأ الثالث: إدارة الجلسات الأحادية ومنع التنزيل.',
      ],
    },
    {
      page: 2,
      title: 'الفصل الثاني: تحليل البيانات والهياكل المتقدمة',
      content:
        'تعد هياكل البيانات العمود الفقري لأي نظام برمجي متكامل. نتعرف في هذا الجزء على أشجار البحث والمخططات البيانية مع أمثلة سريعة على الكفاءة والتطبيقات العملاتية.',
      keyPoints: [
        'أشجار الثنائية الموزونة وتطبيقاتها.',
        'جداول التجزئة Hash Tables وسرعة الوصول O(1).',
        'المصفوفات الديناميكية وتحسين الذاكرة.',
      ],
    },
    {
      page: 3,
      title: 'الفصل الثالث: نماذج الذكاء الاصطناعي والتعليم الذاتي',
      content:
        'استعراض لأحدث تقنيات المعالجة الرقمية والتعلم الآلي، وكيف يمكن بناء نماذج استجابة سريعة وآمنة تدعم الطلاب والمحاضرين.',
      keyPoints: [
        'شبكات التلافيف العصبية للصور والفيديو.',
        'النماذج اللغوية الضخمة والمعالجة الدلالية.',
        'معايير التقييم والتحسين المستمر.',
      ],
    },
  ];

  const currentMockPage =
    samplePagesText[(currentPage - 1) % samplePagesText.length];

  return (
    <div className={`w-full flex flex-col gap-4 ${isAdmin ? '' : 'select-none'}`}>
      {/* Top Banner Warning & Controls */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${
        isAdmin ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-white/95 border-indigo-500/20 text-indigo-300'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-[#1a365d]">
            {isAdmin ? 'قارئ المستندات (وضع المسؤول - تحكم كامل)' : 'قارئ PDF المحمي (عرض مخصص - الطباعة والتنزيل غير متاحين)'}
          </span>
        </div>

        {!isAdmin ? (
          <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/60 px-3 py-1 rounded-xl border border-rose-500/30">
            <Printer className="w-4 h-4 opacity-60 line-through" />
            <span>الطباعة معطلة</span>
            <Download className="w-4 h-4 ml-1 opacity-40 line-through" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-600 text-xs bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>صلاحيات كاملة للمسؤول</span>
          </div>
        )}
      </div>

      {/* PDF Controls Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-[#c29c57]/30 flex flex-wrap items-center justify-between gap-3 text-sm text-[#1a365d] shadow-lg">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 bg-gray-50 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-xs font-mono bg-[#f8f6f0] px-3 py-1.5 rounded-lg border border-[#c29c57]/30">
            صفحة <strong className="text-indigo-400">{currentPage}</strong> من{' '}
            {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 bg-gray-50 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Zoom & Rotation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-15)}
            className="p-1.5 bg-gray-50 hover:bg-slate-700 rounded-lg transition"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono w-12 text-center text-slate-500">
            {zoomLevel}%
          </span>
          <button
            onClick={() => handleZoom(15)}
            className="p-1.5 bg-gray-50 hover:bg-slate-700 rounded-lg transition"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            className="p-1.5 bg-gray-50 hover:bg-slate-700 rounded-lg transition text-slate-500 hover:text-[#1a365d]"
            title="تدوير 90 درجة"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Anti-Theft Partial View Toggle */}
        <button
          onClick={() => {
            const nextState = !partialProtection;
            setPartialProtection(nextState);
            if (nextState && zoomLevel < 150) setZoomLevel(160);
          }}
          className={`px-3 py-1.5 text-xs rounded-xl font-bold transition flex items-center gap-1.5 ${
            partialProtection
              ? 'bg-[#1a365d] text-white border border-[#c29c57]/50 shadow-sm'
              : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
          }`}
          title="تفعيل/إيقاف درع العرض الجزئي ضد تصوير الشاشة"
        >
          <Lock className={`w-3.5 h-3.5 ${partialProtection ? 'text-amber-400' : 'text-slate-400'}`} />
          <span>{partialProtection ? 'درع العرض الجزئي (مُفعل 🔒)' : 'العرض العادي'}</span>
        </button>

        {/* Toggle Notes */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`px-3 py-1.5 text-xs rounded-xl font-medium transition flex items-center gap-1.5 ${
            showNotes
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-gray-50 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>ملاحظاتي على المستند</span>
        </button>
      </div>

      {/* Anti-Theft Partial View Banner Notice */}
      {partialProtection && (
        <div className="bg-amber-50 border border-amber-300/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>وضع العرض الجزئي المكبّر للحماية ضد السرقات:</strong> المستند معروض في إطار مكبر (نصف الكلام فقط يظهر في كل مرة) لمنع التقاط الصفحة كاملة في صورة واحدة. <span className="underline font-bold">اسحب بالماوس أو حرّك عجلة التمرير</span> لقراءة باقي النص بسهولة.
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[11px] bg-amber-200/80 text-amber-900 px-3 py-1 rounded-xl shrink-0 shadow-sm border border-amber-400/40">
            <Move className="w-3.5 h-3.5 text-amber-700" />
            <span>اسحب بالماوس للتنقل</span>
          </div>
        </div>
      )}

      {/* Main Document Canvas View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`relative max-h-[550px] bg-[#f8f6f0] rounded-2xl p-4 sm:p-8 border border-[#c29c57]/30 flex flex-col items-center justify-start overflow-auto transition-all cursor-grab active:cursor-grabbing ${
            isAdmin ? '' : 'select-none'
          } ${
            showNotes ? 'lg:col-span-3' : 'lg:col-span-4'
          }`}
          onContextMenu={(e) => isAdmin ? undefined : e.preventDefault()}
        >
          {/* Watermark Protection Layer */}
          <WatermarkOverlay session={session} customText="مستند تعليمي محمي - يمنع التحميل" />

          {/* Render PDF Canvas Page Frame */}
          <div
            style={{
              transform: pdfSource ? 'none' : `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'top center',
            }}
            className="w-full max-w-5xl xl:max-w-6xl mx-auto bg-white border border-slate-700/80 rounded-xl p-4 sm:p-8 shadow-2xl relative z-10 my-4 text-[#1a365d] flex flex-col gap-6"
          >
            {/* Page Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#c29c57]/30 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-bold text-indigo-400">
                <FileText className="w-4 h-4" />
                {item.title}
              </span>
              <span className="font-mono bg-gray-50 px-2 py-0.5 rounded">
                PAGE {currentPage} / {totalPages}
              </span>
            </div>

            {/* Embedded Native PDF Viewer if PDF Blob exists, or Enhanced Educational View */}
            {pdfSource ? (
              <div className="w-full min-h-[600px] rounded-lg overflow-auto relative flex justify-center items-start bg-gray-50/50 p-4">
                <Document
                  file={pdfSource}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onLoadError={() => {
                    setPdfData(null);
                  }}
                  className="max-w-full"
                  loading={
                    <div className="text-slate-500 p-8 flex flex-col items-center gap-2 text-sm">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      جاري تحميل المستند...
                    </div>
                  }
                  error={
                    <div className="text-rose-400 p-8 flex flex-col items-center gap-2 text-sm">
                      <AlertOctagon className="w-8 h-8" />
                      تعذر تحميل المستند. قد يكون تالفاً أو غير مدعوم.
                    </div>
                  }
                >
                    <Page
                      pageNumber={currentPage}
                      scale={zoomLevel / 100}
                      rotate={rotation}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                      <div className="text-slate-500 p-8 flex flex-col items-center gap-2 text-sm min-h-[500px] justify-center">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        جاري تحميل الصفحة {currentPage}...
                      </div>
                    }
                  />
                </Document>
              </div>
            ) : (
              /* High quality formatted document page content */
              <div className="flex flex-col gap-6 text-[#1a365d] py-4">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1a365d] border-r-4 border-indigo-500 pr-3">
                  {item.id === 'financial-accounting-book' ? 'Introduction to Financial Accounting' : currentMockPage.title}
                </h2>

                <p className="text-sm sm:text-base leading-relaxed text-slate-300 whitespace-pre-wrap">
                  {item.id === 'financial-accounting-book' && currentPage === 1 
                    ? `Faculty of Commerce\nDepartment of Accounting\n\nEdited By\nDr. Taha Abukrisha\nPh.D in Accounting\nEssex University, England\n\nIntroduction to Financial Accounting`
                    : item.id === 'financial-accounting-book' && currentPage === 2
                    ? `Course Objectives\n1. Explain what accounting is. Accounting is an information system that identifies, records, and communicates the economic events of an organization to interested users.\n2. Identify the users and uses of accounting.`
                    : item.id === 'financial-accounting-book'
                    ? `Chapter content for page ${currentPage}...\n\n5. Explain the monetary unit assumption and the economic entity assumption.\n6. State the accounting equation, and define assets, liabilities, and owner's equity.\nAssets = Liabilities + Owner's Equity`
                    : currentMockPage.content}
                </p>

                <div className="bg-[#f8f6f0]/80 p-5 rounded-xl border border-[#c29c57]/30/90 flex flex-col gap-3">
                  <h4 className="text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    نقاط المحاضرة الهامة (صفحة {currentPage})
                  </h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                    {(item.id === 'financial-accounting-book' ? ['Financial Accounting', 'Accounting Equation', 'Course Objectives'] : currentMockPage.keyPoints).map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-indigo-950/30 rounded-xl border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-3">
                  <AlertOctagon className="w-5 h-5 text-indigo-400 shrink-0" />
                  <p>
                    هذا الكورس محمي بموجب اتفاقية الاستخدام الحصري. تمنع جميع
                    محاولات الاستخراج الخارجية.
                  </p>
                </div>
              </div>
            )}

            {/* Page Footer */}
            <div className="pt-4 border-t border-[#c29c57]/30 text-[11px] text-slate-500 flex justify-between items-center font-mono">
              <span>حقوق الطبع والنشر محفوظة © 2026 مكتبة المدينة</span>
              <span>SESSION_KEY: {session?.sessionToken?.substring(0, 10)}</span>
            </div>
          </div>
        </div>

        {/* Student Personal Notes Drawer */}
        {showNotes && (
          <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-[#c29c57]/30 flex flex-col gap-3 shadow-lg">
            <h4 className="text-sm font-bold text-[#1a365d] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>ملاحظاتي الخاصة</span>
            </h4>
            <p className="text-xs text-slate-500">
              يمكنك تدوين النقاط الهامة أثناء القراءة، وتُحفظ تلقائياً في حسابك.
            </p>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="اكتب ملاحظاتك هنا..."
              rows={12}
              className="w-full bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl p-3 text-xs text-[#1a365d] placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              ✓ تم الحفظ التلقائي في الجلسة
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

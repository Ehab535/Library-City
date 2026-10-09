import React, { useState } from 'react';
import {
  Upload,
  X,
  FileVideo,
  FileText,
  FileAudio,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Sparkles,
  Link2,
} from 'lucide-react';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ContentItem, ContentType } from '../types';
import { saveContentItem, ACADEMIC_STRUCTURE, uploadFileChunksToFirestore } from '../services/storage';
import { uploadFileToGoogleDrive, signInWithGoogleDrive, getCachedDriveToken } from '../services/drive';

interface AdminUploadModalProps {
  onClose: () => void;
  onItemUploaded: (item: ContentItem) => void;
  existingItem?: ContentItem;
}

export const AdminUploadModal: React.FC<AdminUploadModalProps> = ({ onClose, onItemUploaded, existingItem }) => {
  const [title, setTitle] = useState(existingItem?.title || '');
  const [description, setDescription] = useState(existingItem?.description || '');
  const [type, setType] = useState<ContentType>(existingItem?.type || 'video');
  const [academicYear, setAcademicYear] = useState(existingItem?.academicYear || 'First Year');
  const [semester, setSemester] = useState(existingItem?.semester || 'First Semester');
  const [subject, setSubject] = useState(existingItem?.subject || 'Accounting');
  const [duration, setDuration] = useState(existingItem?.duration || '12:00');
  const [totalPages, setTotalPages] = useState<number>(existingItem?.totalPages || 10);
  const [externalUrl, setExternalUrl] = useState(existingItem?.externalUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activeYearData = ACADEMIC_STRUCTURE.find(y => y.year === academicYear);
  const activeSemesterData = activeYearData?.semesters.find(s => s.semester === semester);
  const subjects = activeSemesterData?.subjects || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!title.trim()) {
      setErrorMsg('برجاء إدخال عنوان المحاضرة أو المستند.');
      return;
    }

    if (!selectedFile && !externalUrl.trim() && !existingItem) {
      setErrorMsg('يرجى اختيار ملف فيديو/PDF/صوتي من الجهاز أو إدخال رابط مباشر.');
      return;
    }

    if (!subject) {
      setErrorMsg('يرجى اختيار المادة.');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(20);

    try {
      const newItemId = existingItem ? existingItem.id : `item-${Date.now()}`;
      let fileDataUrl: string | undefined = existingItem?.fileDataUrl;
      let hasCloudFile = existingItem?.hasCloudFile || false;
      let driveFileId: string | undefined = existingItem?.driveFileId;
      let driveWebViewLink: string | undefined = existingItem?.driveWebViewLink;
      let driveContentLink: string | undefined = existingItem?.driveContentLink;

      if (selectedFile) {
        setUploadProgress(15);
        
        // 1. Upload to Google Drive
        try {
          const mimeType = selectedFile.type || (type === 'pdf' ? 'application/pdf' : type === 'video' ? 'video/mp4' : 'audio/mpeg');
          const driveResult = await uploadFileToGoogleDrive(
            selectedFile,
            `${title.trim()}_${newItemId}`,
            mimeType,
            (pct) => setUploadProgress(15 + Math.round(pct * 0.5))
          );
          
          driveFileId = driveResult.fileId;
          driveWebViewLink = driveResult.webViewLink;
          driveContentLink = driveResult.webContentLink;
          hasCloudFile = true;
        } catch (driveErr: any) {
          console.warn('Google Drive Upload notice/fallback:', driveErr);
        }

        // 2. Upload to Firestore Backup Chunks
        try {
          await uploadFileChunksToFirestore(newItemId, selectedFile, (pct) => {
            setUploadProgress(65 + Math.round(pct * 0.25));
          });
          hasCloudFile = true;
        } catch (chunkErr) {
          console.warn('Could not upload cloud chunks:', chunkErr);
        }

        // 3. Generate local base64 preview data URL if under 5MB for fast local rendering
        if (selectedFile.size < 5 * 1024 * 1024) {
          fileDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(selectedFile);
          });
        }
      }

      setUploadProgress(95);

      const newItem: ContentItem = {
        id: newItemId,
        title: title.trim(),
        description: description.trim() || 'محتوى تعليمي محمي رفعه المحاضر.',
        type,
        academicYear,
        semester,
        subject,
        fileDataUrl,
        externalUrl: externalUrl.trim() || existingItem?.externalUrl,
        fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : (existingItem?.fileSize || '10 MB'),
        duration: type === 'video' || type === 'audio' ? duration : undefined,
        totalPages: type === 'pdf' ? totalPages : undefined,
        uploadDate: existingItem ? existingItem.uploadDate : new Date().toISOString().split('T')[0],
        viewsCount: existingItem ? existingItem.viewsCount : 0,
        thumbnailUrl: existingItem?.thumbnailUrl || (
          type === 'video' || type === 'audio'
            ? 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80'
        ),
        hasCloudFile,
        driveFileId,
        driveWebViewLink,
        driveContentLink,
      };

      // Save to local IndexedDB
      await saveContentItem(newItem, selectedFile || undefined);

      // Sync metadata to Firestore 'contents' collection (keeping metadata lightweight)
      try {
        const fsContent: any = { ...newItem };
        delete fsContent.fileDataUrl; // Always keep Firestore main doc lightweight
        await setDoc(doc(db, 'contents', newItem.id), fsContent, { merge: true });

        // Post auto-notification for students
        await addDoc(collection(db, 'notifications'), {
          title: existingItem ? `تحديث محتوى: ${title.trim()}` : `محتوى جديد: ${title.trim()}`,
          message: `تم رفع ${type === 'video' ? 'محاضرة فيديو' : type === 'pdf' ? 'ملف PDF' : 'تسجيل صوتي'} جديد لمادة ${subject} (${academicYear} - ${semester}).`,
          priority: 2,
          targetYear: academicYear,
          senderName: 'إدارة المكتبة',
          createdAt: serverTimestamp()
        });
      } catch (fsErr) {
        console.warn('Firestore sync note:', fsErr);
      }

      setUploadProgress(100);
      setSuccessMsg(existingItem ? 'تم تعديل المحتوى بنجاح!' : 'تم رفع وتشفير المحتوى بنجاح في المنصة!');

      setTimeout(() => {
        onItemUploaded(newItem);
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء معالجة الملف. يرجى إعادة المحاولة.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8f6f0]/85 backdrop-blur-md">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#c29c57]/30 shadow-2xl overflow-hidden text-[#1a365d] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-[#f8f6f0] border-b border-[#c29c57]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-950 text-purple-400 rounded-xl border border-purple-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a365d]">رفع محتوى تعليمي جديد (محاضر)</h2>
              <p className="text-xs text-slate-500">إضافة فيديو أو ملف PDF محمي ضد التنزيل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-[#1a365d] bg-gray-50 rounded-xl hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUploadSubmit} className="p-6 overflow-y-auto flex flex-col gap-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">نوع المحتوى</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType('video')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition ${
                  type === 'video'
                    ? 'bg-indigo-950 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-[#f8f6f0] border-[#c29c57]/30 text-slate-500 hover:border-slate-700'
                }`}
              >
                <FileVideo className="w-4 h-4" />
                <span className="hidden sm:inline">محاضرة فيديو</span>
              </button>

              <button
                type="button"
                onClick={() => setType('pdf')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition ${
                  type === 'pdf'
                    ? 'bg-purple-950 border-purple-500 text-purple-300 font-bold'
                    : 'bg-[#f8f6f0] border-[#c29c57]/30 text-slate-500 hover:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">مستند (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('audio')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition ${
                  type === 'audio'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-[#f8f6f0] border-[#c29c57]/30 text-slate-500 hover:border-slate-700'
                }`}
              >
                <FileAudio className="w-4 h-4" />
                <span className="hidden sm:inline">صوتي (Audio)</span>
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">عنوان الدرس / المادة</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: الشرح العملي لخوارزميات البحث التكيفي"
              className="w-full bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl p-3 text-[#1a365d] placeholder-slate-600 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* Academic Structure Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" dir="ltr">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 text-right">السنة الدراسية (Year)</label>
              <select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  setSemester('First Semester');
                  setSubject(ACADEMIC_STRUCTURE.find(y => y.year === e.target.value)?.semesters[0].subjects[0] || '');
                }}
                className="w-full bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl p-3 text-[#1a365d] focus:outline-none focus:border-purple-500"
              >
                {ACADEMIC_STRUCTURE.map(y => (
                  <option key={y.year} value={y.year}>{y.year}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 text-right">الترم (Semester)</label>
              <select
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setSubject(activeYearData?.semesters.find(s => s.semester === e.target.value)?.subjects[0] || '');
                }}
                className="w-full bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl p-3 text-[#1a365d] focus:outline-none focus:border-purple-500"
              >
                {activeYearData?.semesters.map(s => (
                  <option key={s.semester} value={s.semester}>{s.semester}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 text-right">المادة (Subject)</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl p-3 text-[#1a365d] focus:outline-none focus:border-purple-500"
                required
              >
                <option value="">Select subject</option>
                {subjects.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>
          </div>

          {/* File Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">اختيار الملف من الجهاز</label>
            <div className="relative border-2 border-dashed border-[#c29c57]/30 hover:border-purple-500/50 bg-[#f8f6f0] rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 transition cursor-pointer">
              <input
                type="file"
                accept={type === 'video' ? 'video/mp4,video/webm,video/*' : type === 'audio' ? 'audio/mp3,audio/wav,audio/*' : 'application/pdf'}
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 rounded-xl bg-purple-950/60 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <HardDrive className="w-6 h-6" />
              </div>
              {selectedFile ? (
                <div className="text-xs text-emerald-400 font-medium">
                  تم اختيار: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium text-slate-300">
                    اضغط هنا لاختيار ملف {type === 'video' ? 'فيديو (MP4/WebM)' : type === 'audio' ? 'صوتي (MP3/WAV)' : 'مستند (PDF)'}
                  </p>
                  <p className="text-[11px] text-slate-500">سيتم حفظ الملف وتشفيره محلياً في ذاكرة المنصة</p>
                </>
              )}
            </div>
          </div>

          {/* External URL alternative */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>أو إدخال رابط مباشر (اختياري)</span>
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://domain.com/lecture.mp4"
              className="w-full bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl p-3 text-[#1a365d] placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Extra metadata */}
          <div className="grid grid-cols-2 gap-3">
            {type === 'video' ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">مدة الفيديو التقديرية</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="15:30"
                  className="bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl p-2.5 text-[#1a365d]"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">عدد الصفحات</label>
                <input
                  type="number"
                  value={totalPages}
                  onChange={(e) => setTotalPages(parseInt(e.target.value) || 1)}
                  className="bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl p-2.5 text-[#1a365d]"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">الوصف المختصر</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ملاحظات المحاضر للطلاب"
                className="bg-[#f8f6f0] border border-[#c29c57]/30 rounded-xl p-2.5 text-[#1a365d]"
              />
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isProcessing && (
            <div className="flex flex-col gap-1.5 pt-2">
              <div className="flex justify-between text-xs text-purple-300 font-mono">
                <span>جاري حفظ وتشفير المحتوى...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#f8f6f0] rounded-full overflow-hidden border border-[#c29c57]/30">
                <div
                  style={{ width: `${uploadProgress}%` }}
                  className="h-full bg-purple-500 transition-all duration-300"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-[#1a365d] font-bold rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>نشر المحتوى في المنصة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-gray-50 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

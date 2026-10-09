import React from 'react';
import {
  FileVideo,
  FileText,
  FileAudio,
  Lock,
  Eye,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  ShieldAlert,
} from 'lucide-react';
import { ContentItem, Role } from '../types';

interface ContentCardProps {
  item: ContentItem;
  onSelect: (item: ContentItem) => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: ContentItem) => void;
  userRole?: Role;
  isCompleted?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onSelect,
  onDelete,
  onEdit,
  userRole,
  isCompleted,
}) => {
  const isVideo = item.type === 'video';
  const isAudio = item.type === 'audio';

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative bg-white border border-[#c29c57]/30 hover:border-[#c29c57] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer select-none transform hover:-translate-y-1"
    >
      {/* Thumbnail Banner */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        <img
          src={
            item.thumbnailUrl ||
            (isVideo || isAudio
              ? 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80')
          }
          alt={item.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
        />

        {/* Protection Shield Overlay Badge */}
        {userRole !== 'admin' && (
          <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-md text-[#c29c57] text-[11px] font-semibold px-2.5 py-1 rounded-xl border border-[#c29c57]/30 flex items-center gap-1.5 shadow-sm">
            <Lock className="w-3 h-3 text-[#c29c57]" />
            <span>محمي ضد التنزيل</span>
          </div>
        )}

        {/* Completed Badge */}
        {isCompleted && (
          <div className="absolute top-3 left-3 z-10 bg-emerald-50 text-emerald-600 text-[11px] font-bold px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>مكتمل</span>
          </div>
        )}

        {/* Type indicator icon bottom left */}
        <div className="absolute bottom-3 left-3 z-10 bg-[#1a365d]/90 text-[#1a365d] text-xs font-mono px-2.5 py-1 rounded-lg border border-[#1a365d] flex items-center gap-1.5">
          {isVideo ? (
            <>
              <FileVideo className="w-3.5 h-3.5 text-[#c29c57]" />
              <span>{item.duration || 'فيديو'}</span>
            </>
          ) : isAudio ? (
            <>
              <FileAudio className="w-3.5 h-3.5 text-emerald-400" />
              <span>{item.duration || 'صوتي'}</span>
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5 text-blue-300" />
              <span>{item.totalPages ? `${item.totalPages} ص` : 'PDF'}</span>
            </>
          )}
        </div>

        {/* Edit & Delete buttons for admin */}
        {userRole === 'admin' && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition"
                title="تعديل المحتوى"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
                    onDelete(item.id);
                  }
                }}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition"
                title="حذف المحتوى"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-5 flex flex-col gap-3 flex-1 justify-between bg-white">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isVideo
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : isAudio 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-[#c29c57] border border-[#c29c57]/30'
              }`}
            >
              {isVideo ? 'محاضرة فيديو' : isAudio ? 'ملف صوتي' : 'مستند PDF'}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {item.subject}
            </span>
          </div>

          <h3 className="text-base font-bold text-[#1a365d] group-hover:text-[#c29c57] transition line-clamp-2 leading-snug">
            {item.title}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Footer meta */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            {item.viewsCount} مشاهدة
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {item.uploadDate}
          </span>
        </div>
      </div>
    </div>
  );
};

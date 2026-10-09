import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ShieldCheck,
  Lock,
  Sparkles,
  Settings,
  Bookmark,
  CheckCircle2,
} from 'lucide-react';
import { ContentItem, UserSession } from '../types';
import { WatermarkOverlay } from './WatermarkOverlay';

interface ProtectedVideoPlayerProps {
  item: ContentItem;
  session: UserSession | null;
  videoBlobUrl?: string | null;
  onProgressUpdate?: (contentId: string, currentSeconds: number, isFinished: boolean) => void;
  initialTime?: number;
}

export const ProtectedVideoPlayer: React.FC<ProtectedVideoPlayerProps> = ({
  item,
  session,
  videoBlobUrl,
  onProgressUpdate,
  initialTime = 0,
}) => {
  const isAdmin = session?.role === 'admin' || session?.email === 'khalafehab07@gmail.com';
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [savedNote, setSavedNote] = useState('');
  const [noteSavedToast, setNoteSavedToast] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoSource = videoBlobUrl || item.fileDataUrl || item.externalUrl;

  useEffect(() => {
    if (videoRef.current && initialTime > 0) {
      videoRef.current.currentTime = initialTime;
    }
  }, [initialTime]);

  // Handle right click blocking and key shortcut defense
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+S, Ctrl+P, Ctrl+U (view source)
      if (
        (e.ctrlKey || e.metaKey) &&
        ['s', 'S', 'p', 'P', 'u', 'U', 'i', 'I'].includes(e.key)
      ) {
        e.preventDefault();
        alert('المحتوى محمي. تمنع أدوات التنزيل أو الطباعة.');
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(curr);
    setDuration(dur);

    const isFinished = dur > 0 && curr >= dur - 1;
    if (onProgressUpdate) {
      onProgressUpdate(item.id, Math.floor(curr), isFinished);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  const saveBookmark = () => {
    setNoteSavedToast(true);
    setTimeout(() => setNoteSavedToast(false), 3000);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Protection Badge */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm ${
        isAdmin ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-white/90 border-amber-500/20 text-amber-300'
      }`}>
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            {isAdmin
              ? (item.type === 'audio' ? 'مشغل الصوتيات (وضع المسؤول - تحكم كامل)' : 'مشغل الفيديو (وضع المسؤول - تحكم كامل)')
              : (item.type === 'audio' ? 'مشغل الصوتيات المحمي (استماع فقط - التنزيل ملغى)' : 'مشغل الفيديو المحمي (عرض فقط - التنزيل ملغى)')
            }
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs dir-ltr font-mono">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAdmin ? 'ADMIN MODE' : `SESSION: ${session?.username}`}</span>
        </div>
      </div>

      {/* Main Video Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onContextMenu={(e) => isAdmin ? undefined : e.preventDefault()}
        className={`relative group w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#c29c57]/30 ${isAdmin ? '' : 'select-none'} aspect-video flex items-center justify-center`}
      >
        {/* Anti-Piracy Floating Watermark */}
        <WatermarkOverlay session={session} customText="عرض تعليمي محمي - التنزيل ممنوع" />

        {/* Video Shield Overlay to block raw video interaction / context menu */}
        <div
          onClick={handlePlayPause}
          onContextMenu={(e) => isAdmin ? undefined : e.preventDefault()}
          className="absolute inset-0 z-20 cursor-pointer"
        />

        {/* The Native HTML5 Video Element */}
        {videoSource ? (
          <video
            ref={videoRef}
            src={videoSource}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            controlsList={isAdmin ? undefined : "nodownload noplaybackrate noremoteplayback"}
            disablePictureInPicture={!isAdmin}
            disableRemotePlayback={!isAdmin}
            playsInline
            poster={item.type === 'audio' ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80' : undefined}
            className={`w-full h-full object-contain ${isAdmin ? '' : 'pointer-events-none'} ${item.type === 'audio' ? 'opacity-50 blur-sm' : ''}`}
          />
        ) : (
          <div className="text-center p-8 text-slate-500 flex flex-col items-center gap-3">
            <Lock className="w-12 h-12 text-slate-600 animate-pulse" />
            <p className="text-sm">جاري تحميل المحتوى المشفر للمحاضرة...</p>
          </div>
        )}

        {/* Big Center Play/Pause Indicator on Toggle */}
        {!isPlaying && (
          <div
            onClick={handlePlayPause}
            className="absolute z-25 inset-0 m-auto w-16 h-16 rounded-full bg-indigo-600/90 text-[#1a365d] flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform backdrop-blur-sm border border-indigo-400/40"
          >
            <Play className="w-8 h-8 ml-1 fill-white" />
          </div>
        )}

        {/* Custom Controls Bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 transition-opacity duration-300 flex flex-col gap-2 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Seek Bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300 font-mono w-12 text-left">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700 accent-indigo-500 rounded-lg cursor-pointer hover:h-2 transition-all"
            />
            <span className="text-xs text-slate-500 font-mono w-12 text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls Actions Row */}
          <div className="flex items-center justify-between text-[#1a365d] pt-1">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={handlePlayPause}
                className="p-2 hover:bg-white/10 rounded-lg transition text-indigo-400 hover:text-indigo-300"
                title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <button
                onClick={() => skipTime(-10)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-300"
                title="تراجع 10 ثوان"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => skipTime(10)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-300"
                title="تقديم 10 ثوان"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  onClick={toggleMute}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-300"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-700 accent-indigo-400 rounded cursor-pointer hidden sm:block"
                />
              </div>
            </div>

            {/* Right Controls (Speed, Bookmark, Fullscreen) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Speed Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-md transition font-mono flex items-center gap-1 text-[#1a365d]"
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{playbackRate}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-700 rounded-xl shadow-xl p-1 flex flex-col gap-1 min-w-24 text-xs z-40">
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className={`px-3 py-1.5 text-right rounded-lg transition ${
                          playbackRate === rate
                            ? 'bg-indigo-600 text-[#1a365d] font-bold'
                            : 'text-slate-300 hover:bg-gray-50'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bookmark timestamp */}
              <button
                onClick={saveBookmark}
                className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-amber-300"
                title="حفظ علامة مرجعية عند الدقيقة الحالية"
              >
                <Bookmark className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-[#1a365d]"
                title="ملء الشاشة"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bookmark Save Notification Toast */}
      {noteSavedToast && (
        <div className="flex items-center gap-2 bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs sm:text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>تم تسجيل العلامة المرجعية عند الدقيقة {formatTime(currentTime)} بنجاح!</span>
        </div>
      )}

      {/* Video Description & Security Note */}
      <div className="bg-white/60 p-5 rounded-2xl border border-[#c29c57]/30/80 flex flex-col gap-3">
        <h3 className="text-lg font-bold text-[#1a365d] flex items-center gap-2">
          <span>{item.title}</span>
          <span className={`text-xs font-normal px-2.5 py-0.5 rounded-full border ${item.type === 'audio' ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/20' : 'text-indigo-400 bg-indigo-950/60 border-indigo-500/20'}`}>
            {item.type === 'audio' ? 'ملف صوتي' : 'محاضرة فيديو'}
          </span>
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
        
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 border-t border-[#c29c57]/30/80 gap-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            مدة المحاضرة: {item.duration || formatTime(duration)}
          </span>
          <span className="text-rose-400 bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-500/20">
            تنويه: تم تعطيل خيارات تنزيل وحفظ الملف بناءً على السياسة الأمنية للمنصة
          </span>
        </div>
      </div>
    </div>
  );
};

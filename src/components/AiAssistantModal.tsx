import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  User, 
  RotateCcw, 
  Copy, 
  Check, 
  BookOpen, 
  Lightbulb, 
  Compass, 
  BrainCircuit,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isNativeApp } from '../firebase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYear?: string;
  contextSubject?: string;
}

const SUGGESTED_QUESTIONS = [
  {
    icon: Compass,
    text: "أنا تائه ومش عارف أبدأ مذاكرة منين، اعمل إيه؟",
    category: "توجيه عام",
  },
  {
    icon: Lightbulb,
    text: "كيف أستعد للامتحانات النهائية بدون توتر؟",
    category: "نصائح امتحانات",
  },
  {
    icon: BookOpen,
    text: "ما هي أفضل طريقة لعمل ملخصات ممتازة للمواد؟",
    category: "أساليب ذاكرة",
  },
  {
    icon: BrainCircuit,
    text: "كيف أتغلب على التشتت وأحافظ على تركيزي أثناء المذاكرة؟",
    category: "التركيز",
  },
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  academicYear,
  contextSubject,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `أهلاً بك! 👋 أنا **المساعد الأكاديمي الذكي**. 

إذا كنت تشعر بالشتات، أو لديك أي استفسار عن المواد، المذاكرة، وتنظيم وقتك، أن هنا لمساعدتك خطوة بخطوة.

${contextSubject ? `📌 **المادة الحالية:** ${contextSubject}` : ''}
${academicYear ? `🎓 **المرحلة الأكاديمية:** ${academicYear}` : ''}

كيف يمكنني دعمك اليوم؟`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      if (isNativeApp && !apiBase) {
        throw new Error('المساعد الذكي غير متاح في التطبيق حالياً. استخدمه من نسخة الموقع.');
      }

      const res = await fetch(`${apiBase}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          academicYear,
          contextSubject,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل الاتصال بخادم الذكاء الاصطناعي');
      }

      const data = await res.json();
      const botReply: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply || 'لم أتمكن من إجابة السؤال حالياً.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error('AI Assistant Error:', err);
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **عذراً:** ${err.message || 'حدث خطأ في الاتصال بالسيرفر. يرجى المحاولة بعد لحظات.'}`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-msg-reset',
        role: 'assistant',
        content: `تم إعادة ضبط المحادثة بنجاح 🔄. كيف يمكنني مساعدتك الآن؟`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl h-[85vh] max-h-[750px] bg-slate-900 border border-[#c29c57]/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1a365d] via-slate-900 to-[#1a365d] p-4 sm:p-5 border-b border-[#c29c57]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c29c57]/20 border border-[#c29c57] flex items-center justify-center text-[#c29c57] shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white tracking-wide">
                  المساعد الأكاديمي الذكي
                </h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                مرشدك الشخصي للشرح، التنظيم، والتغلب على تشتت الدراسة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              title="إعادة بدء المحادثة"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950/60 scrollbar-thin scrollbar-thumb-slate-800">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-md ${
                  msg.role === 'user'
                    ? 'bg-[#c29c57] text-slate-950'
                    : 'bg-[#1a365d] text-[#c29c57] border border-[#c29c57]/40'
                }`}
              >
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`group relative max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#1a365d] text-white rounded-tr-none border border-[#c29c57]/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-slate-100">
                  {msg.content}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-1.5">
                  <span>{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-slate-400 hover:text-amber-400"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Thinking Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#1a365d] text-[#c29c57] border border-[#c29c57]/40 flex items-center justify-center">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl rounded-tl-none px-5 py-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c29c57] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#c29c57] animate-bounce delay-150"></span>
                <span className="w-2 h-2 rounded-full bg-[#c29c57] animate-bounce delay-300"></span>
                <span className="text-xs text-slate-400 mr-2 font-medium">يقوم الذكاء الاصطناعي بإعداد الإجابة...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Questions */}
        {messages.length < 5 && (
          <div className="bg-slate-900/90 border-t border-slate-800/80 px-4 py-3">
            <p className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#c29c57]" />
              أسئلة ومقترحات سريعة للبدء:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q, idx) => {
                const IconComponent = q.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q.text)}
                    disabled={isLoading}
                    className="flex items-center gap-2 text-right text-xs bg-slate-950/70 hover:bg-[#1a365d]/50 border border-slate-800 hover:border-[#c29c57]/40 p-2.5 rounded-2xl text-slate-300 transition group disabled:opacity-50"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#c29c57]/10 text-[#c29c57] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{q.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="اكتب سؤالك أو ما تشعر بالشتات فيه هنا..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-[#c29c57] text-white text-sm rounded-2xl px-4 py-3 outline-none transition placeholder-slate-500 disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            className="w-12 h-12 bg-gradient-to-r from-[#c29c57] to-amber-600 hover:brightness-110 disabled:opacity-40 text-slate-950 rounded-2xl flex items-center justify-center transition shadow-lg font-bold flex-shrink-0"
            title="إرسال"
          >
            <Send className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

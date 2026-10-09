import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // The Android app runs from https://localhost inside a WebView, so it is a
  // cross-origin caller of this API.
  const allowedOrigins = new Set(["https://localhost", "http://localhost", "capacitor://localhost"]);
  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // Initialize Gemini AI client safely
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("مفتاح GEMINI_API_KEY غير متوفر في متغيرات البيئة.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API endpoint for AI assistant chat
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, contextSubject, academicYear } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "المحادثة فارغة أو غير صالحة." });
      }

      const ai = getAiClient();

      const systemInstruction = `أنت "المساعد الأكاديمي الذكي" التابع للمنصة التعليمية الجامعية.
وظيفتك الأساسية هي مساعدة الطلاب والدكاترة وإجابة استفساراتهم الأكاديمية والشخصية المتعلقة بالدراسة والمواد والتوجيه التعليمي.

الأسلوب والتعامل:
1. التحدث بلغة عربية راقية، ودودة، ومبسطة مع إمكانية استخدام المصطلحات الإنجليزية العلمية المعتمدة.
2. إذا كان الطالب تائهاً أو يشعر بالضغط والشتات، قدم له خطوات إيجابية عمليّة واضحة ومحددة لترتيب أفكاره ومذاكرته.
3. قم بتنسيق الإجابة بشكل رائع باستخدام النقاط والقوائم والعناوين الفرعية ليقضي الطالب وقتاً ممتعاً في القراءة.
${academicYear ? `المرحلة الأكاديمية الحالية للطالب: ${academicYear}` : ''}
${contextSubject ? `المادة المحددة في الصفحة: ${contextSubject}` : ''}`;

      const contents = messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || "عذراً، لم أستطع توليد إجابة في الوقت الحالي. يرجى المحاولة مرة أخرى.";
      return res.json({ reply });
    } catch (error: any) {
      console.error("Gemini AI API Error:", error);
      return res.status(500).json({
        error: error.message || "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

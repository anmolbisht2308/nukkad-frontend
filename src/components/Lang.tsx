"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/* Lightweight English / Hindi switch for the most-used labels. Add keys as screens get translated. */
const dict = {
  en: {
    pulse: "Pulse", play: "Play", compete: "Compete", creators: "Creators", home: "Home", me: "Me", login: "Log in",
    whatsOn: "What's on", today: "Today", tonight: "Tonight", weekend: "Weekend", week: "This week",
    liveNow: "🚚 Live right now", liveSub: "Food trucks parked and serving",
    happening: "🎉 Happening", happeningSub: "Run clubs, rides, games and food fests",
    openingSoon: "⏳ Opening soon", openingSub: "Tap notify to be first through the door",
    hotDeals: "🎟️ Hot deals", dealsSub: "Claim, then show the code at the counter",
    justOpened: "✨ Just opened", justOpenedSub: "New in the last three weeks",
  },
  hi: {
    pulse: "पल्स", play: "खेलो", compete: "मुकाबला", creators: "क्रिएटर्स", home: "होम", me: "मैं", login: "लॉग इन",
    whatsOn: "क्या चल रहा है", today: "आज", tonight: "आज रात", weekend: "वीकेंड", week: "इस हफ़्ते",
    liveNow: "🚚 अभी लाइव", liveSub: "फ़ूड ट्रक जो अभी लगे हैं",
    happening: "🎉 इवेंट्स", happeningSub: "रन क्लब, राइड्स, गेम्स और फ़ूड फ़ेस्ट",
    openingSoon: "⏳ जल्द खुल रहे हैं", openingSub: "सबसे पहले जाने के लिए नोटिफ़ाई दबाएँ",
    hotDeals: "🎟️ हॉट डील्स", dealsSub: "क्लेम करें, काउंटर पर कोड दिखाएँ",
    justOpened: "✨ अभी खुले", justOpenedSub: "पिछले तीन हफ़्तों में नए",
  },
} as const;

export type Lang = keyof typeof dict;
export type Key = keyof (typeof dict)["en"];

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({ lang: "en", setLang: () => {}, t: (k) => dict.en[k] });
export const useLang = () => useContext(LangCtx);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nukkad.lang");
      if (saved === "hi") document.documentElement.lang = "hi";
      if (saved === "hi" || saved === "en") Promise.resolve().then(() => setLangState(saved));
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem("nukkad.lang", l);
    } catch {}
  };
  return <LangCtx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</LangCtx.Provider>;
}

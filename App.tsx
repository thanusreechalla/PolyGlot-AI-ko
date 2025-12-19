
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Languages, 
  ArrowLeftRight, 
  Volume2, 
  Copy, 
  Check, 
  Trash2, 
  History,
  Sparkles,
  Loader2,
  Mic,
  MicOff
} from 'lucide-react';
import { LANGUAGES, TTS_VOICES } from './constants';
import { TranslationHistoryItem } from './types';
import { translateTextStream, playSpeech } from './services/geminiService';
import LanguageSelector from './components/LanguageSelector';

const App: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Fix: Use number for browser-based timeout reference instead of NodeJS.Timeout
  const translationTimeoutRef = useRef<number | null>(null);

  // Load history from local storage
  useEffect(() => {
    const savedHistory = localStorage.getItem('translation_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save history to local storage
  useEffect(() => {
    localStorage.setItem('translation_history', JSON.stringify(history));
  }, [history]);

  const handleTranslate = useCallback(async (text: string, src: string, tgt: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      return;
    }

    setIsTranslating(true);
    setTranslatedText('');
    
    try {
      let fullTranslation = '';
      await translateTextStream(text, src, tgt, (chunk) => {
        fullTranslation += chunk;
        setTranslatedText(fullTranslation);
      });

      // Add to history if it's a significant translation
      if (text.length > 3) {
        const newItem: TranslationHistoryItem = {
          id: Date.now().toString(),
          sourceText: text,
          translatedText: fullTranslation,
          sourceLang: src,
          targetLang: tgt,
          timestamp: Date.now(),
        };
        setHistory(prev => [newItem, ...prev.slice(0, 49)]);
      }
    } catch (error) {
      console.error(error);
      setTranslatedText('Error occurred during translation. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Debounced translation effect
  useEffect(() => {
    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);

    if (sourceText.trim()) {
      // Fix: Use window.setTimeout which returns a number in the browser environment
      translationTimeoutRef.current = window.setTimeout(() => {
        handleTranslate(sourceText, sourceLang, targetLang);
      }, 800);
    } else {
      setTranslatedText('');
    }

    return () => {
      if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
    };
  }, [sourceText, sourceLang, targetLang, handleTranslate]);

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeech = async () => {
    if (!translatedText || isSpeaking) return;
    setIsSpeaking(true);
    try {
      await playSpeech(translatedText);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('translation_history');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 md:px-8">
      {/* Header */}
      <header className="mb-10 text-center flex flex-col items-center">
        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg mb-4 text-white">
          <Languages size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          PolyGlot <span className="text-indigo-600">AI</span>
        </h1>
        <p className="text-gray-500 mt-2 font-medium">Next-gen translation powered by Gemini 3</p>
      </header>

      {/* Main Translation UI */}
      <main className="w-full max-w-6xl space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-0 glass rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
          
          {/* Source Panel */}
          <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100 p-6 min-h-[350px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <LanguageSelector 
                  value={sourceLang} 
                  onChange={setSourceLang} 
                />
              </div>
              <button 
                onClick={handleSwapLanguages}
                disabled={sourceLang === 'auto'}
                className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${sourceLang === 'auto' ? 'opacity-30 cursor-not-allowed' : 'text-indigo-600'}`}
                title="Swap Languages"
              >
                <ArrowLeftRight size={20} />
              </button>
            </div>
            
            <textarea
              className="flex-grow w-full bg-transparent resize-none text-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none scrollbar-hide"
              placeholder="What would you like to translate?"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              maxLength={5000}
            />
            
            <div className="mt-4 flex items-center justify-between text-gray-400">
              <div className="flex space-x-2">
                <button className="p-2 hover:text-indigo-600 transition-colors" title="Voice Input (Coming Soon)">
                  <Mic size={20} />
                </button>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider">{sourceText.length}/5000</span>
            </div>
          </div>

          {/* Result Panel */}
          <div className="flex flex-col p-6 bg-gray-50/30 min-h-[350px] relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <LanguageSelector 
                  value={targetLang} 
                  onChange={setTargetLang} 
                  excludeAuto
                />
              </div>
              
              {isTranslating && (
                <div className="flex items-center space-x-2 text-indigo-600 animate-pulse">
                  <Sparkles size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Translating</span>
                </div>
              )}
            </div>

            <div className={`flex-grow w-full text-xl font-medium ${translatedText ? 'text-gray-900' : 'text-gray-400'}`}>
              {translatedText || (isTranslating ? '' : 'Translation will appear here...')}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex space-x-1">
                <button 
                  onClick={handleSpeech}
                  disabled={!translatedText || isSpeaking}
                  className={`p-3 rounded-xl hover:bg-white hover:shadow-md transition-all ${!translatedText || isSpeaking ? 'opacity-30' : 'text-gray-600 hover:text-indigo-600'}`}
                >
                  {isSpeaking ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
                </button>
                <button 
                  onClick={handleCopy}
                  disabled={!translatedText}
                  className={`p-3 rounded-xl hover:bg-white hover:shadow-md transition-all ${!translatedText ? 'opacity-30' : 'text-gray-600 hover:text-indigo-600'}`}
                >
                  {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${showHistory ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white text-gray-600 hover:shadow-md'}`}
              >
                <History size={18} />
                <span className="text-sm font-semibold">History</span>
              </button>
            </div>
          </div>
        </div>

        {/* History Section */}
        {showHistory && (
          <div className="glass rounded-3xl p-6 shadow-xl border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <History className="mr-2 text-indigo-600" />
                Recent Activity
              </h3>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-sm font-bold text-red-500 hover:text-red-600 flex items-center space-x-1 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-medium">
                No recent translations yet.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((item) => (
                  <div key={item.id} className="group relative bg-white/50 hover:bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest space-x-2">
                        <span>{LANGUAGES.find(l => l.code === item.sourceLang)?.name}</span>
                        <ArrowLeftRight size={12} />
                        <span>{LANGUAGES.find(l => l.code === item.targetLang)?.name}</span>
                      </div>
                      <button 
                        onClick={() => deleteHistoryItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 line-clamp-2">{item.sourceText}</p>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-600 font-medium line-clamp-2">{item.translatedText}</p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-10 text-[10px] text-gray-300 font-bold">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-auto pt-10 text-gray-400 text-sm font-medium">
        Built with Google Gemini API &bull; {new Date().getFullYear()}
      </footer>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;

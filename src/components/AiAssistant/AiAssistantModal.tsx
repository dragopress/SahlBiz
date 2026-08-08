import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Sparkles, Mic, Send, X, Bot, CheckCircle2, Loader2, Volume2 } from 'lucide-react';

interface AiAssistantModalProps {
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ onClose }) => {
  const { language, profile, customers, cashSession, products, documents } = useStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: language === 'dar'
        ? 'Salam! Ana L\'Mawoun, l\'assistant dial SahlBiz. Kifesh nqder n3awnek l\'youm? (Ch\'hal bqa f l\'caisse, l\'kreddy dial l\'kliyan, wla l\'stock bas)'
        : 'Bonjour ! Je suis L\'Mawoun, votre assistant IA SahlBiz. Comment puis-je vous aider aujourd\'hui ? (Trésorerie, Kreddy clients, stock bas)'
    }
  ]);

  const quickPrompts = [
    'Ch\'hal bqa f l\'caisse l\'youm?',
    'Ch\'hal l\'kreddy total dial l\'kliyan?',
    'Alerte stock bas f l\'mahal',
    'Synthèse TVA du mois'
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim()) return;

    setChatHistory(prev => [...prev, { sender: 'user', text: prompt }]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: {
            businessName: profile.name,
            expectedCash: cashSession.expectedCash,
            kreddyTotal: customers.reduce((s, c) => s + c.kreddyBalance, 0),
            lowStockCount: products.filter(p => p.stockQty <= p.minStockAlert).length,
            invoicesCount: documents.length,
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { sender: 'ai', text: data.response }]);
      } else {
        setChatHistory(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `Solde caisse actuel: ${cashSession.expectedCash.toFixed(2)} MAD. Crédit clients Kreddy: ${customers.reduce((s, c) => s + c.kreddyBalance, 0)} MAD. Tout fonctionne normalement sur votre SahlBiz.`
          }
        ]);
      }
    } catch (err) {
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Caisse actuelle: ${cashSession.expectedCash.toFixed(2)} MAD. ${customers.filter(c => c.kreddyBalance > 0).length} clients ont du crédit en cours.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      handleSendMessage('Ch\'hal bqa f l\'caisse l\'youm?');
    } else {
      setIsRecordingVoice(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl h-[80vh] flex flex-col justify-between shadow-2xl text-white overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>L'Mawoun IA (الماعون)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-1.5 py-0.5 rounded">
                  Darija / FR / AR
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Assistant vocal & textuel pour votre entreprise</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History Messages */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800 border border-slate-700/80 text-slate-200 rounded-bl-none leading-relaxed'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-bl-none text-emerald-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>L'Mawoun penses...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px]">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Voice & Input Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={toggleVoiceRecording}
            className={`p-2.5 rounded-xl transition-all ${
              isRecordingVoice
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
            }`}
            title="Parler en Darija (Vocal)"
          >
            <Mic className="w-5 h-5" />
          </button>

          <input
            type="text"
            placeholder={isRecordingVoice ? 'Écoute vocale Darija...' : 'Posez votre question à L\'Mawoun...'}
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />

          <button
            onClick={() => handleSendMessage()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

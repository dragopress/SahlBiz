import React, { useState } from 'react';
import { MessageSquare, Copy, Check, ExternalLink, X } from 'lucide-react';

interface WhatsAppModalProps {
  phone: string;
  recipientName: string;
  defaultMessage: string;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  phone,
  recipientName,
  defaultMessage,
  onClose
}) => {
  const [messageText, setMessageText] = useState(defaultMessage);
  const [isCopied, setIsCopied] = useState(false);

  // Format Moroccan Phone Number (+212)
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('212') ? cleanPhone : `212${cleanPhone.replace(/^0/, '')}`;

  const handleOpenWhatsAppLink = () => {
    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Relance WhatsApp SahlBiz</h3>
              <p className="text-[11px] text-slate-400">Pour: <b>{recipientName}</b> ({phone})</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Message Darija / Français</label>
          <textarea
            rows={4}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleCopyText}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Copié !' : 'Copier le texte'}</span>
          </button>

          <button
            onClick={handleOpenWhatsAppLink}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ouvrir WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
};

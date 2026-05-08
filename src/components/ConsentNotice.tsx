import React from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConsentNoticeProps {
  onAccept: () => void;
}

const openExternal = (url: string) => {
  if (window.electronAPI?.openExternal) {
    void window.electronAPI.openExternal(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};

export const ConsentNotice: React.FC<ConsentNoticeProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: 0.22, ease: [0.19, 1, 0.22, 1] }}
        className="w-full max-w-[360px] overflow-hidden rounded-lg bg-slate-200 text-slate-800 shadow-[0_18px_50px_rgba(0,0,0,0.34)]"
      >
        <div className="mx-4 mt-4 rounded-lg bg-white p-3 text-[12px] leading-5 text-slate-800 shadow-[0_8px_22px_rgba(15,23,42,0.18)]">
          <p className="mb-1 font-medium">By clicking "Agree and continue":</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              I confirm that I have read the{' '}
              <button
                type="button"
                onClick={() => openExternal('https://www.cluegent.com/privacy.html')}
                className="inline-flex items-center gap-1 text-blue-700 hover:underline"
              >
                Privacy Notice <ExternalLink size={10} />
              </button>{' '}
              and the{' '}
              <button
                type="button"
                onClick={() => openExternal('https://www.cluegent.com/terms.html')}
                className="inline-flex items-center gap-1 text-blue-700 hover:underline"
              >
                Terms <ExternalLink size={10} />
              </button>.
            </li>
            <li>
              I will use listening, screenshots, transcription, and AI assistance only where I have permission.
            </li>
            <li>
              Before you continue, you must consent to Cluegent processing the content you submit,
              including audio, transcripts, prompts, and screenshots, as described in the Privacy Notice.
            </li>
          </ul>
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={onAccept}
            className="w-full rounded-md bg-blue-700 px-4 py-3 text-[12px] font-semibold text-white shadow-[0_8px_18px_rgba(29,78,216,0.28)] transition hover:bg-blue-600 active:translate-y-px"
          >
            Agree and continue
          </button>
        </div>
      </motion.div>
    </div>
  );
};

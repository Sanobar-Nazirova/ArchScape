import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Download, Check } from 'lucide-react';

interface QRCodeModalProps {
  onClose: () => void;
}

export default function QRCodeModal({ onClose }: QRCodeModalProps) {
  const url = window.location.href;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: '#e0ddd8', light: '#1e1e26' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'tour-qr-code.png';
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="bg-nm-base border border-nm-border rounded-2xl p-6 w-[420px] max-w-[95vw] shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-nm-text font-semibold text-base">QR Code</h3>
          <button
            onClick={onClose}
            className="text-nm-muted hover:text-nm-text transition-colors p-1 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          <div
            className="rounded-xl p-3 border border-nm-border flex items-center justify-center"
            style={{
              background: '#1e1e26',
              width: 200,
              height: 200,
              boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.5), inset -2px -2px 6px rgba(255,255,255,.03)',
            }}
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code for tour URL" className="w-full h-full rounded" />
            ) : (
              <div className="w-full h-full animate-pulse rounded" style={{ background: 'var(--nm-surface)' }} />
            )}
          </div>
        </div>

        {/* URL display */}
        <div
          className="rounded-xl px-3 py-2.5 mb-4 border border-nm-border"
          style={{ background: 'var(--nm-surface)', boxShadow: 'inset 2px 2px 6px rgba(0,0,0,.4)' }}
        >
          <p className="text-[10px] text-nm-muted mb-1 uppercase tracking-wide">Tour URL</p>
          <p className="text-xs text-nm-text font-mono break-all leading-relaxed">{url}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm border border-nm-border rounded-xl text-nm-text hover:border-nm-accent hover:text-white transition-colors"
            style={{ boxShadow: '3px 3px 8px var(--sh-d), -2px -2px 5px var(--sh-l)' }}
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--nm-accent)', boxShadow: '3px 3px 10px rgba(224,123,63,.45)' }}
          >
            <Download size={14} />
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}

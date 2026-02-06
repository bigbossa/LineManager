import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { LineConfig, getLineConfig, saveLineConfig, getBotInfo } from '../services/lineService';

interface LineConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: LineConfig) => void;
}

export const LineConfigModal: React.FC<LineConfigModalProps> = ({ isOpen, onClose, onSave }) => {
  const [channelId, setChannelId] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [botInfo, setBotInfo] = useState<{ displayName: string; pictureUrl?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getLineConfig();
      if (config) {
        setChannelId(config.channelId);
        setChannelAccessToken(config.channelAccessToken);
      }
      setVerifyStatus('idle');
      setVerifyMessage('');
      setBotInfo(null);
    }
  }, [isOpen]);

  const handleVerify = async () => {
    if (!channelAccessToken.trim()) {
      setVerifyStatus('error');
      setVerifyMessage('Please enter Channel Access Token');
      return;
    }

    setIsVerifying(true);
    setVerifyStatus('idle');
    setVerifyMessage('');

    // Temporarily save to test
    const tempConfig: LineConfig = {
      channelId: channelId.trim(),
      channelAccessToken: channelAccessToken.trim(),
    };
    saveLineConfig(tempConfig);

    const result = await getBotInfo();

    if (result.success && result.data) {
      setVerifyStatus('success');
      setVerifyMessage(`Connected to: ${result.data.displayName}`);
      setBotInfo({
        displayName: result.data.displayName,
        pictureUrl: result.data.pictureUrl,
      });
    } else {
      setVerifyStatus('error');
      setVerifyMessage(result.error || 'Failed to verify token');
      setBotInfo(null);
    }

    setIsVerifying(false);
  };

  const handleSave = () => {
    if (!channelAccessToken.trim()) {
      setVerifyStatus('error');
      setVerifyMessage('Channel Access Token is required');
      return;
    }

    const config: LineConfig = {
      channelId: channelId.trim(),
      channelAccessToken: channelAccessToken.trim(),
    };

    saveLineConfig(config);
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full transform transition-all scale-100">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-[#06C755] p-2 rounded-lg">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">LINE Messaging API</h3>
              <p className="text-xs text-gray-500">Configure your LINE Official Account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Channel ID
            </label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="e.g., 1657890123"
              className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in LINE Developers Console → Your Channel → Basic settings
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Channel Access Token <span className="text-red-500">*</span>
            </label>
            <textarea
              value={channelAccessToken}
              onChange={(e) => setChannelAccessToken(e.target.value)}
              placeholder="Paste your long-lived channel access token here..."
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm font-mono text-xs resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in LINE Developers Console → Your Channel → Messaging API → Channel access token
            </p>
          </div>

          {/* Verify Status */}
          {verifyStatus !== 'idle' && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                verifyStatus === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {verifyStatus === 'success' ? (
                <>
                  {botInfo?.pictureUrl && (
                    <img
                      src={botInfo.pictureUrl}
                      alt={botInfo.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700 font-medium">{verifyMessage}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-700">{verifyMessage}</span>
                </>
              )}
            </div>
          )}

          {/* Help Link */}
          <a
            href="https://developers.line.biz/console/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Open LINE Developers Console
          </a>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center rounded-b-xl border-t border-gray-100">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-4 py-2 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Token'
            )}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

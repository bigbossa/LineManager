import React, { useEffect, useState } from 'react';

interface ApiKeyModalProps {
  onKeySet: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySet }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if key exists in env (simulated for this demo via checking if we need to show modal)
    // In this specific Gemini 3 demo environment, window.aistudio handles keys, but standard env usage is process.env.
    // We will use the aistudio helper if available, or just proceed if process.env.API_KEY is there.
    if (!process.env.API_KEY) {
       // Ideally we would prompt, but per instructions we rely on process.env.API_KEY or aistudio selection
       // If standard env key is missing, we might need to trigger the selector.
       checkKey();
    }
  }, []);

  const checkKey = async () => {
     if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
           setIsOpen(true);
        }
     }
  };

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
       await window.aistudio.openSelectKey();
       // Assume success per instructions
       setIsOpen(false);
       onKeySet();
       // Force reload to pick up new env injection if needed, or just callback
       window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl text-center">
        <h2 className="text-xl font-bold mb-4 text-gray-800">API Key Required</h2>
        <p className="text-gray-600 mb-6">
          To use the AI features for personalization, please select a Google Cloud Project with the Gemini API enabled.
          <br/>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm mt-2 block">
            Billing Information
          </a>
        </p>
        <button 
          onClick={handleSelectKey}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-full transition-colors w-full"
        >
          Select API Key
        </button>
      </div>
    </div>
  );
};
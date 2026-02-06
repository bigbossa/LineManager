import React from 'react';

interface PhonePreviewProps {
  message: string;
  recipientName: string;
  avatarUrl: string;
}

export const PhonePreview: React.FC<PhonePreviewProps> = ({ message, recipientName, avatarUrl }) => {
  return (
    <div className="relative mx-auto border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
      <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
      <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
      <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
      
      {/* Screen Content */}
      <div className="rounded-[2rem] overflow-hidden w-full h-full bg-[#8c9eff] relative flex flex-col">
        {/* LINE Header */}
        <div className="bg-[#1D212F] text-white p-4 pt-8 flex items-center shadow-sm z-10">
          <button className="mr-3 text-gray-400">
             <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div className="flex-1 font-semibold truncate text-sm">{recipientName}</div>
          <div className="text-gray-400">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7"></path></svg>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-3 bg-[#7289DA] phone-scroll space-y-4">
          <div className="text-center text-[10px] text-white/70 my-2">Today</div>
          
          {/* Incoming Message Bubble (Simulating the Bot) */}
          <div className="flex items-start mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold mr-2 border-2 border-white shrink-0">
               OA
            </div>
            <div className="flex flex-col max-w-[75%]">
               <div className="text-[10px] text-white/80 mb-1 ml-1">My Business</div>
               <div className="bg-white text-black p-3 rounded-2xl rounded-tl-none shadow-sm text-sm break-words relative">
                  {message || "Generating message..."}
               </div>
               <div className="text-[9px] text-white/70 mt-1 ml-1 text-right">Read 10:42 AM</div>
            </div>
          </div>
        </div>

        {/* Input Area (Mock) */}
        <div className="bg-white p-2 flex items-center border-t border-gray-200">
            <div className="w-6 h-6 text-gray-400 mr-2 cursor-pointer">+</div>
            <div className="w-6 h-6 text-gray-400 mr-2 cursor-pointer">📷</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 px-3 text-xs flex items-center text-gray-400">Aa</div>
            <div className="ml-2 text-blue-500">
               <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
            </div>
        </div>
      </div>
    </div>
  );
};
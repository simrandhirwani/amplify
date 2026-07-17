import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

export default function LiveViewerSandbox() {
  const params = new URLSearchParams(window.location.search);
  const sellerId = params.get('seller') || 'SELLER_TEST';
  
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  
  
  const videoRef = useRef(null);

  useEffect(() => {
    let stream = null;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((err) => console.log("Viewer camera access denied/unavailable", err));

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setStatus('sending');
    try {
      await fetch(`${API_BASE_URL}/api/stream/post-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: sellerId,
          user_name: 'Meesho_Judge',
          text: message
        })
      });
      setMessage('');
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 font-sans">
      
      <div className="mb-4 text-center">
        <h1 className="text-[#9F206C] font-black text-2xl tracking-tighter">meesho</h1>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Live Evaluation Sandbox</p>
      </div>

      <div className="bg-white w-full max-w-[360px] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[650px] border-[8px] border-gray-900 relative">
        
        {/* Stream Header */}
        <div className="bg-[#3B1C54] p-4 text-white flex justify-between items-center z-10 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-sm"></span>
            <span className="font-bold text-xs uppercase tracking-wider">{sellerId} LIVE</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-1 rounded font-bold">412 Viewers</span>
        </div>

        {/* 🎥 THE FIX: Real Video Feed Container */}
        <div className="flex-1 bg-black flex flex-col items-center justify-center relative overflow-hidden">
           <video 
             ref={videoRef} 
             autoPlay 
             playsInline 
             muted 
             className="w-full h-full object-cover scale-x-[-1] absolute inset-0 opacity-90"
           />
           
           <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/20 z-10">
             <span className="text-[10px] font-black text-[#F89A1C] uppercase tracking-wider block mb-1">Testing Instructions:</span>
             <p className="text-xs text-white/90">Type a question below. It will instantly appear on the host's desktop and trigger the Agentic AI.</p>
           </div>
        </div>

        {/* Comment Box Interface */}
        <div className="p-4 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-10">
          <form onSubmit={handleSendMessage} className="flex gap-2 relative">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask the host a question..."
              className="flex-1 bg-[#F8F9FA] border border-[#EAEAEA] rounded-full pl-4 pr-12 py-3 text-sm outline-none focus:border-[#9F206C] transition-colors"
            />
            <button 
              type="submit"
              disabled={status === 'sending' || !message.trim()}
              className="absolute right-1 top-1 bottom-1 bg-[#9F206C] hover:bg-[#851857] text-white w-10 flex items-center justify-center rounded-full transition-all disabled:opacity-50 cursor-pointer"
            >
              {status === 'sent' ? '✓' : '➤'}
            </button>
          </form>
          {status === 'sent' && <p className="text-[10px] text-[#10B981] font-bold text-center mt-2 uppercase tracking-wider">Intercepted by AI Host Copilot!</p>}
        </div>

      </div>
    </div>
  );
}
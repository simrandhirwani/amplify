import React, { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

export default function SmartReelsStudio() {
  const [currentSeller, setCurrentSeller] = useState(() => localStorage.getItem('SELECTED_SELLER_NAME') || '');
  
  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // recommended top-2 products state
  const [recommended, setRecommended] = useState([]);
  
  const [step, setStep] = useState('select');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [formData, setFormData] = useState({ speciality: '', buyer: '', price: '', color: '', occasion: '' });
  const [agentScript, setAgentScript] = useState(null);
  
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [activePlaybackUrl, setActivePlaybackUrl] = useState(null);
  const [imagesMap, setImagesMap] = useState({ angle1: null, angle2: null, angle3: null });
  
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const fileInputRef3 = useRef(null);
  const videoRef = useRef(null);

  //recording refs/state
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const [recordingState, setRecordingState] = useState('idle'); // idle | recording | preview
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);

  
  const fetchSellerCatalog = useCallback(async (sellerId) => {
    if (!sellerId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${sellerId}`);
      if (res.ok) {
        let data = await res.json();
        
        if (typeof data === 'string') data = JSON.parse(data);

        if (Array.isArray(data)) {
          const formattedData = data.map((p, index) => {
            // Check if the backend sent a raw array (from standard cursor) instead of an object
            const isArray = Array.isArray(p);
            
            // Map the SQL columns: id(0), product_id(1), seller_id(2), name(3), description(4), return_rate(5), rating(6)
            const rawProductId = isArray ? p[1] : (p.product_id || p.id);
            const rawName = isArray ? p[3] : (p.name || p.sku);
            const rawReturnRate = isArray ? p[5] : (p.return_rate || p.returnRate);
            const rawRating = isArray ? p[6] : p.rating;

            const safeId = String(rawProductId || `item-${index}`);
            
            return {
              id: safeId,
              sku: String(rawName || "Unnamed Product"),
              returnRate: rawReturnRate || 0,
              rating: rawRating || 0
            };
          });
          setCatalog(formattedData);
        } else {
          setCatalog([]);
        }
      }
    } catch (err) { console.error("Fetch error:", err); }
    setIsLoading(false);
  }, []);

  //fetch top-2 recommended products — separate function, does not touch fetchSellerCatalog
  const fetchRecommended = useCallback(async (sellerId) => {
    if (!sellerId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${sellerId}/recommended`);
      if (res.ok) {
        let data = await res.json();
        if (typeof data === 'string') data = JSON.parse(data);
        if (Array.isArray(data)) {
          const formatted = data.map((p, index) => {
            const isArray = Array.isArray(p);
            const rawProductId = isArray ? p[1] : (p.product_id || p.id);
            const rawName = isArray ? p[3] : (p.name || p.sku);
            const rawReturnRate = isArray ? p[5] : (p.return_rate || p.returnRate);
            const rawRating = isArray ? p[6] : p.rating;
            const rawReason = isArray ? null : p.reason;

            return {
              id: String(rawProductId || `rec-${index}`),
              sku: String(rawName || "Unnamed Product"),
              returnRate: rawReturnRate || 0,
              rating: rawRating || 0,
              reason: rawReason || "No video content yet — video listings convert 40% better on average."
            };
          });
          setRecommended(formatted);
        } else {
          setRecommended([]);
        }
      }
    } catch (err) { console.error("Recommended fetch error:", err); }
  }, []);

  useEffect(() => {
    if (currentSeller) {
      fetchSellerCatalog(currentSeller);
      fetchRecommended(currentSeller); 
    }

    const handleSellerChange = (e) => {
      setCurrentSeller(e.detail);
      fetchSellerCatalog(e.detail);
      fetchRecommended(e.detail); 
      setStep('select'); 
    };

    window.addEventListener('SELLER_INSTANCE_CHANGED_EVENT', handleSellerChange);
    return () => window.removeEventListener('SELLER_INSTANCE_CHANGED_EVENT', handleSellerChange);
  }, [fetchSellerCatalog, fetchRecommended, currentSeller]);

  useEffect(() => {
    let stream = null;
    if (step === 'teleprompter') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }) 
        .then((s) => {
          stream = s;
          streamRef.current = s; 
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => console.warn("Camera pipeline unavailable."));
    }
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [step]);

  useEffect(() => {
    let slideshowInterval;
    if (step === 'ai-video' && imagesMap.angle1 && !activePlaybackUrl?.startsWith('blob:')) {
      const frames = [imagesMap.angle1, imagesMap.angle2, imagesMap.angle3].filter(Boolean);
      let currentIndex = 0;
      slideshowInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % frames.length;
      }, 3000); 
    }
    return () => clearInterval(slideshowInterval);
  }, [step, imagesMap, activePlaybackUrl]);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // 2. THE API CALL
  const executeScriptCompilation = async () => {
    setStep('generating');
    try {
      const res = await fetch(`${API_BASE_URL}/api/reels/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: currentSeller,
          product_id: selectedProduct?.id || "NO-ID", 
          product_name: selectedProduct?.sku || "Product",
          speciality: formData.speciality || "Premium quality", 
          target_buyer: formData.buyer || "Everyone",
          price_positioning: formData.price || "Affordable", 
          color_variant: formData.color || "Beautiful color", 
          occasion: formData.occasion || "Daily wear"
        })
      });
      if (res.ok) setAgentScript(await res.json());
    } catch (e) { console.error(e); }
    setTimeout(() => setStep('fork'), 1500);
  };

  const handleFileSlotSelect = (slotKey, file) => {
    if (file) setImagesMap(prev => ({ ...prev, [slotKey]: URL.createObjectURL(file) }));
  };

  const runLocalPipelineExecution = () => {
    if (!imagesMap.angle1 || !imagesMap.angle2 || !imagesMap.angle3) {
      alert("Please upload all 3 angles to ensure maximum conversion quality!");
      return;
    }
    setIsRenderingVideo(true);
    setTimeout(() => { setIsRenderingVideo(false); setStep('ai-video'); }, 4000);
  };

  
  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedVideoUrl(URL.createObjectURL(blob));
        setRecordingState('preview');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
    } catch (e) {
      console.error("MediaRecorder unavailable:", e);
      alert("Recording isn't supported on this browser/device.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const retakeRecording = () => {
    setRecordedVideoUrl(null);
    setRecordingState('idle');
  };

  const saveRecordingToDevice = () => {
    if (!recordedVideoUrl) return;
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `${selectedProduct?.sku ? selectedProduct.sku.replace(/\s+/g, '_') : 'reel'}_recording.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = (text || '').split(' ');
    let line = '', lines = [];
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word + ' ';
      } else line = test;
    }
    lines.push(line);
    const startY = y - (lines.length - 1) * lineHeight;
    lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + i * lineHeight));
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  const generateBrandedVideo = async () => {
    if (!imagesMap.angle1 || !imagesMap.angle2 || !imagesMap.angle3) {
      alert("Please upload all 3 angles to ensure maximum conversion quality!");
      return;
    }

    setIsRenderingVideo(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280; // 9:16 vertical format
      const ctx = canvas.getContext('2d');

      const images = [imagesMap.angle1, imagesMap.angle2, imagesMap.angle3].filter(Boolean);
      const loadedImages = await Promise.all(images.map(src => new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      })));

      const validImages = loadedImages.filter(Boolean);
      if (validImages.length === 0) {
        setIsRenderingVideo(false);
        alert("Could not load uploaded images. Please try re-uploading them.");
        return;
      }

      const stream = canvas.captureStream(30);
      let recorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      } catch (e) {
        recorder = new MediaRecorder(stream); // fallback mimeType
      }
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setActivePlaybackUrl(url);
        setIsRenderingVideo(false);
        setStep('ai-video');
      };

      recorder.start();

      const FPS = 30;
      const SEC_PER_IMAGE = 4; // 3 images * 4s ≈ 12s total
      const totalFrames = FPS * SEC_PER_IMAGE * validImages.length;
      let frame = 0;

      const captions = [
        agentScript?.hook || "Trending now on Meesho!",
        agentScript?.body || "Premium quality, unbeatable price.",
        agentScript?.call_to_action || "Order now — link in bio!"
      ];

      const drawFrame = () => {
        const imgIndex = Math.min(Math.floor(frame / (FPS * SEC_PER_IMAGE)), validImages.length - 1);
        const localFrame = frame % (FPS * SEC_PER_IMAGE);
        const progress = localFrame / (FPS * SEC_PER_IMAGE);

        const img = validImages[imgIndex];

        
        const canvasAspect = canvas.width / canvas.height;
        const imgAspect = img.width / img.height;
        let baseW, baseH;
        if (imgAspect > canvasAspect) {
          baseH = canvas.height;
          baseW = baseH * imgAspect;
        } else {
          baseW = canvas.width;
          baseH = baseW / imgAspect;
        }
        const scale = 1 + (0.15 * progress);
        const iw = baseW * scale, ih = baseH * scale;
        const ix = (canvas.width - iw) / 2, iy = (canvas.height - ih) / 2;

        ctx.fillStyle = '#111115';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, ix, iy, iw, ih);

        // Dark gradient overlay (bottom) for text readability
        const grad = ctx.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.88)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, canvas.height * 0.55, canvas.width, canvas.height * 0.45);

        // Top subtle scrim so the badge is always legible
        const topGrad = ctx.createLinearGradient(0, 0, 0, 140);
        topGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, canvas.width, 140);

        // Caption text (fade in during first 0.5s of each segment)
        const fadeIn = Math.min(localFrame / (FPS * 0.5), 1);
        ctx.globalAlpha = fadeIn;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 34px Poppins, Arial, sans-serif';
        ctx.textAlign = 'center';
        wrapText(ctx, captions[imgIndex], canvas.width / 2, canvas.height - 160, canvas.width - 80, 42);
        ctx.globalAlpha = 1;

        // Meesho branding badge (top-left, always visible)
        ctx.fillStyle = 'rgba(159, 32, 108, 0.92)'; // Meesho pink
        roundRect(ctx, 24, 40, 150, 42, 21);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 17px Poppins, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('meesho', 46, 67);

        // "Powered by AMPLIFY" small tag (bottom-right)
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Poppins, Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('⚡ Powered by AMPLIFY', canvas.width - 24, canvas.height - 32);
        ctx.globalAlpha = 1;

        frame++;
        if (frame < totalFrames) {
          requestAnimationFrame(drawFrame);
        } else {
          recorder.stop();
        }
      };

      drawFrame();
    } catch (err) {
      console.error("Video generation failed:", err);
      setIsRenderingVideo(false);
      alert("Video generation failed. Please try again.");
    }
  };

  const discardGeneratedVideo = () => {
    setActivePlaybackUrl(null);
    setImagesMap({ angle1: null, angle2: null, angle3: null });
    setStep('select');
  };

  const saveGeneratedVideoToDevice = () => {
    if (!activePlaybackUrl) return;
    const a = document.createElement('a');
    a.href = activePlaybackUrl;
    a.download = `${selectedProduct?.sku ? selectedProduct.sku.replace(/\s+/g, '_') : 'amplify_reel'}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getProgressWidth = () => {
    switch(step) {
      case 'select': return '20%'; case 'brainstorm': return '40%'; case 'generating': return '50%';
      case 'fork': return '60%'; case 'ai-upload': return '80%'; case 'teleprompter': case 'ai-video': return '100%';
      default: return '0%';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12 font-sans relative">
      
      {/* HEADER & PROGRESS BAR */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAEAEA] overflow-hidden">
        <div className="bg-gradient-to-r from-[#3B1C54] to-[#4A2569] flex justify-between items-center text-white p-6">
          <div>
            <h2 className="text-xl font-black tracking-tight">SmartReels Creative Studio</h2>
            <p className="text-sm text-white/80 mt-1">Your autonomous director for viral e-commerce marketing.</p>
          </div>
          <span className="bg-white/20 px-3 py-1.5 rounded-lg text-xs font-mono font-bold">Node: {currentSeller}</span>
        </div>
        <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#F8F9FA]">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
            <span className={step === 'select' ? 'text-[#9F206C]' : (step !== 'select' ? 'text-[#10B981]' : '')}>1. Select</span>
            <span className={step === 'brainstorm' ? 'text-[#9F206C]' : (['fork', 'ai-upload', 'teleprompter', 'ai-video'].includes(step) ? 'text-[#10B981]' : '')}>2. Context</span>
            <span className={step === 'fork' ? 'text-[#9F206C]' : (['ai-upload', 'teleprompter', 'ai-video'].includes(step) ? 'text-[#10B981]' : '')}>3. Review & Path</span>
            <span className={step === 'ai-upload' ? 'text-[#9F206C]' : (['teleprompter', 'ai-video'].includes(step) ? 'text-[#10B981]' : '')}>4. Production</span>
            <span className={['teleprompter', 'ai-video'].includes(step) ? 'text-[#10B981]' : ''}>5. Result</span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#9F206C] h-full transition-all duration-500 ease-out" style={{ width: getProgressWidth() }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-[#EAEAEA] rounded-xl shadow-sm min-h-[640px] flex overflow-hidden">
        
        {/* LEFT COMPONENT WORKSPACE */}
        <div className="w-7/12 p-8 border-r border-[#EAEAEA] flex flex-col bg-[#F8F9FA] overflow-y-auto max-h-[720px]">
          
          {step === 'select' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h3 className="text-lg font-black text-[#3B1C54] uppercase tracking-wider">Step 1: Select Your Product</h3>

              {/* AI Recommended Top-2 section */}
              {recommended.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✨</span>
                    <span className="text-xs font-black text-[#9F206C] uppercase tracking-widest">
                      AI Recommends Starting Here
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {recommended.map((prod) => (
                      <div
                        key={`rec-${prod.id}`}
                        onClick={() => { setSelectedProduct(prod); setStep('brainstorm'); }}
                        className="bg-gradient-to-r from-[#3B1C54]/5 to-[#9F206C]/5 border-2 border-[#9F206C] p-4 rounded-xl cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="text-sm font-black text-[#3B1C54]">{prod.sku}</span>
                            <div className="flex items-center gap-3 mt-1 text-xs font-bold">
                              <span className="text-[#10B981]">★ {prod.rating}</span>
                              <span className="text-red-500">Returns: {prod.returnRate}%</span>
                            </div>
                            <p className="text-[11px] text-gray-600 mt-2 italic">💡 {prod.reason}</p>
                          </div>
                          <button className="bg-[#9F206C] text-white text-[10px] font-black px-3 py-2 rounded-lg uppercase whitespace-nowrap cursor-pointer">
                            Start Here
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 my-4 pt-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Or pick any other product below</span>
                  </div>
                </div>
              )}
              {/* END UPGRADE 1 */}
              
              {isLoading ? (
                <div className="py-10 text-center text-gray-500 text-sm font-bold animate-pulse">Loading live catalog...</div>
              ) : catalog.length === 0 ? (
                 <div className="py-10 text-center text-gray-500 text-sm">No products found for this seller. Please register a sandbox store.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {catalog.map((prod) => (
                    <div key={prod.id} className="bg-white p-5 border border-[#EAEAEA] rounded-xl shadow-sm hover:border-[#9F206C] transition-all flex justify-between items-center group">
                      <div>
                        <span className="text-sm font-black text-gray-800 group-hover:text-[#9F206C]">{prod.sku}</span>
                        <div className="flex items-center gap-3 mt-1.5 text-xs font-bold">
                          <span className="text-[#10B981]">★ {prod.rating}</span>
                          <span className="text-gray-500 text-[10px]">ID: {prod.id}</span>
                          <span className="text-red-500 uppercase tracking-wider text-[10px]">
                            Returns: {prod.returnRate > 0 ? `${prod.returnRate}%` : 'N/A'}
                          </span>
                        </div>
                        {/*Safe optional chaining on prod.id */}
                        {prod.id?.toUpperCase().startsWith("TEST") && (
                           <span className="inline-block mt-2 bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">Live AI Target</span>
                        )}
                      </div>
                      <button onClick={() => { setSelectedProduct(prod); setStep('brainstorm'); }} className="bg-white border border-[#9F206C] text-[#9F206C] group-hover:bg-[#9F206C] group-hover:text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer">
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'brainstorm' && selectedProduct && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <button onClick={() => setStep('select')} className="text-[10px] font-black text-[#9F206C] uppercase tracking-wider self-start hover:underline mb-1">← Change Product</button>
              <div>
                <h3 className="text-xl font-black text-[#3B1C54] leading-tight">Tell me how you want to SELL this.</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Targeting: <span className="font-bold text-[#9F206C]">{selectedProduct.sku}</span></p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-700">What's special about it?</label>
                  <input type="text" name="speciality" value={formData.speciality} onChange={handleInputChange} placeholder="e.g. Pure cotton, breathable..." className="p-3 bg-white border border-[#EAEAEA] rounded-lg text-sm outline-none focus:border-[#3B1C54] shadow-inner" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-700">Who is the buyer?</label>
                  <input type="text" name="buyer" value={formData.buyer} onChange={handleInputChange} placeholder="e.g. Women ke liye jo office jaati ho..." className="p-3 bg-white border border-[#EAEAEA] rounded-lg text-sm outline-none focus:border-[#3B1C54] shadow-inner" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-700">Price positioning?</label>
                  <input type="text" name="price" value={formData.price} onChange={handleInputChange} placeholder="e.g. Bilkul affordable compared to branded..." className="p-3 bg-white border border-[#EAEAEA] rounded-lg text-sm outline-none focus:border-[#3B1C54] shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-700">Color/Variant?</label>
                    <input type="text" name="color" value={formData.color} onChange={handleInputChange} placeholder="e.g. Emerald Green..." className="p-3 bg-white border border-[#EAEAEA] rounded-lg text-sm outline-none focus:border-[#3B1C54] shadow-inner" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-700">Occasion?</label>
                    <input type="text" name="occasion" value={formData.occasion} onChange={handleInputChange} placeholder="e.g. Summer wear..." className="p-3 bg-white border border-[#EAEAEA] rounded-lg text-sm outline-none focus:border-[#3B1C54] shadow-inner" />
                  </div>
                </div>
              </div>
              
              <button onClick={executeScriptCompilation} className="mt-2 w-full bg-[#3B1C54] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-[#2A133D] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                ✨ AI Reimagine This Script
              </button>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center animate-pulse">
              <div className="w-12 h-12 border-4 border-[#9F206C] border-t-transparent rounded-full animate-spin"></div>
              <div>
                <h3 className="text-[#3B1C54] font-black uppercase tracking-widest text-sm">Agent Synthesizing</h3>
                <p className="text-xs text-gray-500 mt-2 font-mono">Translating raw inputs into consumer psychology triggers...</p>
              </div>
            </div>
          )}

          {step === 'fork' && agentScript && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-white border-2 border-[#3B1C54] rounded-xl overflow-hidden shadow-md">
                <div className="bg-[#3B1C54] text-white p-3 flex justify-between items-center">
                   <span className="text-xs font-black uppercase tracking-widest">🎬 Director's Content Brief</span>
                   {selectedProduct?.id?.toUpperCase().startsWith("TEST") && <span className="bg-[#10B981] text-[9px] px-2 py-0.5 rounded-full font-bold">Generated Live by AI</span>}
                </div>
                
                <div className="p-4 bg-[#F8F9FA] border-b border-[#EAEAEA] grid grid-cols-3 gap-2">
                   <div>
                      <span className="text-[9px] text-gray-500 uppercase font-black block">Tone</span>
                      <span className="text-[11px] font-bold text-[#3B1C54] leading-tight block mt-1">{agentScript.tone || "Energetic"}</span>
                   </div>
                   <div>
                      <span className="text-[9px] text-gray-500 uppercase font-black block">Voice Persona</span>
                      <span className="text-[11px] font-bold text-[#3B1C54] leading-tight block mt-1">{agentScript.voice || "Friendly Expert"}</span>
                   </div>
                   <div>
                      <span className="text-[9px] text-gray-500 uppercase font-black block">Core Emotion</span>
                      <span className="text-[11px] font-bold text-[#3B1C54] leading-tight block mt-1">{agentScript.emotion || "Excitement"}</span>
                   </div>
                </div>

                <div className="p-4 flex flex-col gap-3 text-sm">
                   <p className="bg-[#FFFBF7] p-3 rounded-lg border-l-4 border-[#F89A1C]"><strong className="text-[10px] uppercase text-[#F89A1C] block mb-1">Hook (0-3s)</strong> {agentScript.hook}</p>
                   <p className="bg-[#F8F9FA] p-3 rounded-lg border-l-4 border-[#3B1C54]"><strong className="text-[10px] uppercase text-[#3B1C54] block mb-1">Body Pitch</strong> {agentScript.body || agentScript.problem + " " + agentScript.solution + " " + agentScript.special_feature}</p>
                   <p className="bg-red-50 p-3 rounded-lg border-l-4 border-red-500"><strong className="text-[10px] uppercase text-red-500 block mb-1">Call to Action</strong> {agentScript.call_to_action}</p>
                </div>

                <div className="p-4 bg-gray-50 border-t border-[#EAEAEA]">
                   <span className="text-[10px] text-[#3B1C54] uppercase font-black block mb-2">🎥 Shooting Directions</span>
                   <ul className="text-xs text-gray-600 flex flex-col gap-1.5 pl-4 list-disc">
                      {agentScript.b_roll_instructions?.map((inst, idx) => (
                        <li key={idx} className="leading-relaxed">{inst}</li>
                      ))}
                   </ul>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-3 text-center">Ready? Choose your production method:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div onClick={() => setStep('teleprompter')} className="bg-white border border-[#EAEAEA] p-4 rounded-xl flex flex-col gap-2 shadow-sm hover:border-[#3B1C54] transition-colors cursor-pointer text-center">
                    <span className="text-xs font-black text-[#3B1C54] uppercase tracking-widest">🎙️ Record On-Camera</span>
                    <p className="text-[10px] text-gray-500">I will shoot this myself using the AI teleprompter.</p>
                  </div>
                  
                  <div onClick={() => setStep('ai-upload')} className="bg-white border border-[#EAEAEA] p-4 rounded-xl flex flex-col gap-2 shadow-sm hover:border-[#9F206C] transition-colors cursor-pointer text-center">
                    <span className="text-xs font-black text-[#9F206C] uppercase tracking-widest">🤖 Let AI Generate It</span>
                    <p className="text-[10px] text-gray-500">I am camera shy. I will upload photos for the AI to animate.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'ai-upload' && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div>
                <button onClick={() => setStep('fork')} className="text-[10px] font-black text-[#9F206C] uppercase tracking-wider mb-2 hover:underline">← Back to Options</button>
                <h3 className="text-lg font-black text-[#3B1C54] uppercase tracking-wider">Upload Product Photos</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-white p-4 border border-[#EAEAEA] rounded-xl flex items-start gap-4 shadow-sm cursor-pointer" onClick={() => fileInputRef1.current.click()}>
                  <div className="w-16 h-16 bg-[#F8F9FA] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xl overflow-hidden">
                    {imagesMap.angle1 ? <img src={imagesMap.angle1} className="w-full h-full object-cover" alt="Angle 1"/> : "👕"}
                  </div>
                  <input type="file" ref={fileInputRef1} className="hidden" accept="image/*" onChange={(e) => handleFileSlotSelect('angle1', e.target.files[0])} />
                  <div className="flex-1">
                    <span className="text-xs font-black text-[#3B1C54] uppercase block mb-1">Angle 1: Flat Lay</span>
                    {imagesMap.angle1 && <span className="text-[10px] bg-[#10B981] text-white px-2 py-0.5 rounded font-bold">Loaded ✓</span>}
                  </div>
                </div>

                <div className="bg-white p-4 border border-[#EAEAEA] rounded-xl flex items-start gap-4 shadow-sm cursor-pointer" onClick={() => fileInputRef2.current.click()}>
                  <div className="w-16 h-16 bg-[#F8F9FA] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xl overflow-hidden">
                    {imagesMap.angle2 ? <img src={imagesMap.angle2} className="w-full h-full object-cover" alt="Angle 2"/> : "👗"}
                  </div>
                  <input type="file" ref={fileInputRef2} className="hidden" accept="image/*" onChange={(e) => handleFileSlotSelect('angle2', e.target.files[0])} />
                  <div className="flex-1">
                    <span className="text-xs font-black text-[#3B1C54] uppercase block mb-1">Angle 2: Full Fit / Model</span>
                    {imagesMap.angle2 && <span className="text-[10px] bg-[#10B981] text-white px-2 py-0.5 rounded font-bold">Loaded ✓</span>}
                  </div>
                </div>

                <div className="bg-white p-4 border border-[#EAEAEA] rounded-xl flex items-start gap-4 shadow-sm cursor-pointer" onClick={() => fileInputRef3.current.click()}>
                  <div className="w-16 h-16 bg-[#F8F9FA] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xl overflow-hidden">
                    {imagesMap.angle3 ? <img src={imagesMap.angle3} className="w-full h-full object-cover" alt="Angle 3"/> : "🔍"}
                  </div>
                  <input type="file" ref={fileInputRef3} className="hidden" accept="image/*" onChange={(e) => handleFileSlotSelect('angle3', e.target.files[0])} />
                  <div className="flex-1">
                    <span className="text-xs font-black text-[#3B1C54] uppercase block mb-1">Angle 3: Texture Detail</span>
                    {imagesMap.angle3 && <span className="text-[10px] bg-[#10B981] text-white px-2 py-0.5 rounded font-bold">Loaded ✓</span>}
                  </div>
                </div>
              </div>

              {imagesMap.angle1 && imagesMap.angle2 && imagesMap.angle3 && (
                <button onClick={generateBrandedVideo} className="w-full bg-[#10B981] text-white py-3 mt-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-green-600 cursor-pointer transition-colors">
                  Generate Video Now
                </button>
              )}
            </div>
          )}

          {step === 'teleprompter' && agentScript && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-[#3B1C54]">Studio Teleprompter</h3>
                <button onClick={() => { setStep('fork'); retakeRecording(); }} className="text-[10px] bg-gray-200 px-3 py-1 rounded font-bold uppercase cursor-pointer">Exit Camera</button>
              </div>
              <div className="flex-1 bg-white border border-[#EAEAEA] rounded-xl p-5 overflow-y-auto flex flex-col gap-4 text-center">
                <p className="text-base font-black text-gray-800 text-lg">"{agentScript.hook}"</p>
                <p className="text-sm text-gray-700 leading-relaxed font-medium">{agentScript.body || agentScript.problem + " " + agentScript.solution + " " + agentScript.special_feature}</p>
                <p className="text-base font-black text-red-600 text-lg">"{agentScript.call_to_action}"</p>
              </div>

              {/*Recording controls */}
              <div className="mt-4 flex flex-col items-center gap-3">
                {recordingState === 'idle' && (
                  <button
                    onClick={startRecording}
                    className="bg-red-600 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-wider shadow-lg hover:bg-red-700 flex items-center gap-2 cursor-pointer"
                  >
                    🔴 Start Recording
                  </button>
                )}

                {recordingState === 'recording' && (
                  <button
                    onClick={stopRecording}
                    className="bg-gray-900 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-wider shadow-lg animate-pulse flex items-center gap-2 cursor-pointer"
                  >
                    ⏹ Stop & Review
                  </button>
                )}

                {recordingState === 'preview' && recordedVideoUrl && (
                  <div className="flex gap-2 w-full max-w-sm">
                    <button onClick={retakeRecording} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-bold text-xs uppercase cursor-pointer">🔄 Retake</button>
                    <button onClick={retakeRecording} className="flex-1 bg-red-100 text-red-600 py-2.5 rounded-lg font-bold text-xs uppercase cursor-pointer">🗑️ Discard</button>
                    <button onClick={saveRecordingToDevice} className="flex-1 bg-[#10B981] text-white py-2.5 rounded-lg font-bold text-xs uppercase cursor-pointer">💾 Save</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {isRenderingVideo && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center animate-fade-in">
              <div className="w-12 h-12 border-4 border-t-transparent border-[#F89A1C] rounded-full animate-spin" />
              <span className="text-xs font-black text-[#3B1C54] uppercase tracking-wider block">AI Assembling Video Layers</span>
              <span className="text-[10px] text-gray-400 font-mono">Rendering Ken Burns motion, captions & Meesho branding...</span>
            </div>
          )}

          {step === 'ai-video' && (
            <div className="flex flex-col gap-4 animate-fade-in text-center justify-center py-10">
              <span className="text-5xl mb-2">🎉</span>
              <h3 className="text-xl font-black text-[#10B981] uppercase tracking-wide">Video Rendered Successfully</h3>
              <p className="text-xs text-gray-500 -mt-2">Branded, captioned, and ready to share.</p>
              <div className="flex gap-3 mt-6 max-w-sm mx-auto w-full">
                <button onClick={() => alert("Campaign synced to Meesho Live Feed successfully!")} className="flex-1 bg-[#10B981] hover:bg-green-600 text-white font-bold py-3.5 rounded-xl text-xs uppercase shadow-sm cursor-pointer">📤 Publish to Feed</button>
                <button onClick={saveGeneratedVideoToDevice} className="flex-1 bg-white border border-[#3B1C54] text-[#3B1C54] font-bold py-3.5 rounded-xl text-xs uppercase hover:bg-gray-50 cursor-pointer">💾 Save to Device</button>
              </div>
              <div className="flex gap-3 max-w-sm mx-auto w-full">
                <button onClick={discardGeneratedVideo} className="flex-1 bg-white border border-red-200 text-red-500 font-bold py-3 rounded-xl text-xs uppercase hover:bg-red-50 cursor-pointer">🗑️ Discard</button>
                <button onClick={() => {setStep('select'); setImagesMap({angle1:null, angle2:null, angle3:null}); setActivePlaybackUrl(null);}} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl text-xs uppercase hover:bg-gray-50 cursor-pointer">🎬 New Video</button>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT PANEL: SMARTPHONE SIMULATOR */}
        <div className="w-5/12 bg-[#1E1E24] flex items-center justify-center p-6 relative border-l border-gray-800">
          
          <div className="w-full max-w-[260px] aspect-[9/16] bg-[#111115] rounded-[2.5rem] border-8 border-gray-900 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center">
            
            <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-2xl w-1/2 mx-auto z-50"></div>

            {/*friendlier idle state, replaces the plain "CANVAS OFFLINE" box */}
            {(step === 'select' || step === 'brainstorm' || step === 'generating') && (
              <div className="text-center p-4 flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-[#3B1C54] to-[#1E1E24] relative overflow-hidden">
                <div className="absolute w-40 h-40 bg-[#9F206C]/20 rounded-full blur-3xl animate-pulse"></div>
                <span className="text-5xl mb-3 relative z-10">🎬</span>
                <p className="text-xs text-white/70 font-bold uppercase tracking-widest relative z-10">Your Reel Preview</p>
                <p className="text-[10px] text-white/40 mt-1 relative z-10">Will appear here once script is ready</p>
              </div>
            )}

            {(step === 'fork' || step === 'ai-upload') && agentScript && (
              <div className="absolute inset-0 bg-gray-900 flex flex-col p-4 animate-fade-in">
                <div className="absolute top-8 left-4 text-white/50 text-[8px] uppercase">Live Script Preview</div>
                <div className="mt-auto flex flex-col gap-4 z-10 mb-8">
                   <div className="bg-black/60 p-3 rounded-lg border border-white/20">
                     <span className="text-[8px] text-[#F89A1C] font-black uppercase mb-1 block">Hook</span>
                     <p className="text-white text-xs font-bold shadow-sm">"{agentScript.hook}"</p>
                   </div>
                </div>
              </div>
            )}

            {step === 'teleprompter' && recordingState !== 'preview' && (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute top-8 left-4 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded animate-pulse z-20">LIVE</div>
              </>
            )}

            {step === 'teleprompter' && recordingState === 'preview' && recordedVideoUrl && (
              <video src={recordedVideoUrl} controls autoPlay loop className="absolute inset-0 w-full h-full object-cover z-30" />
            )}
            
            {step === 'ai-video' && activePlaybackUrl && (
              <video src={activePlaybackUrl} controls autoPlay loop className="absolute inset-0 w-full h-full object-cover z-10" />
            )}

          </div>
        </div>

      </div>
      <style>{`@keyframes kenburns { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }`}</style>
    </div>
  );
}

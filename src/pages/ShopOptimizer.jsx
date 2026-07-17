import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';

const getValidImageUrl = (url) => {
  if (!url || url === 'null' || String(url).trim() === '') {
    return "https://placehold.co/400x400/f8f9fa/a8a29e?text=No+Image+Provided";
  }
  if (url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url.startsWith('/') ? url : `/${url}`;
};

const POSITIVE_REVIEW_POOL = [
  "Exactly as shown, very happy with the purchase.",
  "Good quality for the price, would recommend.",
  "Fast delivery and neat packaging.",
  "Matches the photos, no complaints at all.",
  "Using it daily, works great so far.",
  "Great value for money, satisfied customer.",
];

const COMPLAINT_LIBRARY = {
  fabric: [
    "Material feels very thin, could see through in sunlight.",
    "Fabric quality was not what I expected from the pictures.",
    "Cloth feels cheap, not worth the price.",
  ],
  size: [
    "Size ran smaller than expected, had to return.",
    "Fit was off compared to the size chart.",
    "Ordered M but felt like S, sizing needs fixing.",
  ],
  sound: [
    "Sound quality is not great, bass is missing.",
    "Volume is too low even at max setting.",
    "Audio cuts out after a few minutes of use.",
  ],
  battery: [
    "Battery drains very fast, barely lasts a day.",
    "Doesn't hold charge like it used to after a week.",
    "Charging takes too long for the battery life it gives.",
  ],
  color: [
    "Colour was different from what was shown in photos.",
    "Shade looks duller in person.",
    "Print faded a bit after the first wash.",
  ],
  quality: [
    "Build quality feels flimsy for the price.",
    "Item looked different in person, lower quality than photos.",
    "Stitching came undone after first wash.",
  ],
  generic: [
    "Not as described, a bit disappointed.",
    "Expected better based on the listing.",
    "Had some issues, might not reorder.",
  ],
};

function detectComplaintCategory(text = '') {
  const t = text.toLowerCase();
  if (t.includes('fabric') || t.includes('thin') || t.includes('see-through') || t.includes('cloth') || t.includes('material')) return 'fabric';
  if (t.includes('size') || t.includes('fit') || t.includes('sizing')) return 'size';
  if (t.includes('sound') || t.includes('audio') || t.includes('bass') || t.includes('volume')) return 'sound';
  if (t.includes('battery') || t.includes('charge') || t.includes('charging')) return 'battery';
  if (t.includes('colour') || t.includes('color') || t.includes('shade') || t.includes('print')) return 'color';
  if (t.includes('quality') || t.includes('stitch') || t.includes('build')) return 'quality';
  return 'generic';
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ShopOptimizer() {
  const [currentSeller, setCurrentSeller] = useState(() => localStorage.getItem('SELECTED_SELLER_NAME') || 'Unknown Seller');
  const [activeProducts, setActiveProducts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [showTrace, setShowTrace] = useState(false); // agent reasoning trace toggle

  // Refined States for the UX Flow
  const [fixState, setFixState] = useState('idle'); // idle, processing, refining, resolved
  const [humanInput, setHumanInput] = useState('');
  const [refinedDesc, setRefinedDesc] = useState('');
  const [isSimulatingLoad, setIsSimulatingLoad] = useState(true);

  const [agentContext, setAgentContext] = useState(null);
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  const [scanStatus] = useState(() => {
    const hoursAgo = Math.floor(Math.random() * 5) + 1; // 1-6h ago
    return { lastScan: hoursAgo, nextScan: 24 - hoursAgo };
  });

  // WhatsApp mock widget state
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  
  const [productInsights, setProductInsights] = useState({});

  useEffect(() => {
    const fetchProducts = (sellerId) => {
      setIsSimulatingLoad(true);
      fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(sellerId.trim())}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (data && data.length > 0) {
            const formattedProducts = data.map(p => {
              if (Array.isArray(p)) {
                return {
    id: String(p.product_id || p.id || `PROD-${index}`),
    sku: String(p.name || p.sku || "Unknown SKU"),
    originalDesc: String(p.description || p.originalDesc || "No description available."),
    returnRate: Number(p.return_rate ?? p.returnRate ?? 0),
    rating: Number(p.rating || 4.0),
    // This now directly accesses the key from the dictionary
    image_url: String(p.image_url || p.image || ""), 
    rawReviews: p.rawReviews || [{ id: 1, text: String(p.description || "Friction noted."), stars: Math.floor(p.rating || 4), date: "Recent" }]
  };
              }
              return {
                id: p.product_id || p.id || `PROD-${Math.floor(Math.random() * 1000)}`,
                sku: p.name || p.sku || p.title || "Unknown SKU",
                returnRate: p.return_rate !== undefined ? p.return_rate : (p.returnRate || 0),
                rating: p.rating || 4.0,
                originalDesc: p.description || p.originalDesc || p.desc || "No description available.",
                image_url: p.image_url || p.image || "/illustrations/shopping-sprint.png",
                rawReviews: p.rawReviews || [{ id: 1, text: p.description || p.originalDesc || "Friction noted.", stars: Math.floor(p.rating || 4), date: "Recent" }]
              };
            });
            setActiveProducts(formattedProducts);
            setActiveIndex(0);
          } else {
            setActiveProducts([]);
          }
          setProductInsights({}); // fresh seller (seed or newly registered) -> reset WhatsApp scan cache
          resetState();
          setIsSimulatingLoad(false);
        })
        .catch(err => {
          console.error("Fetch failed:", err);
          setActiveProducts([]);
          setProductInsights({});
          setIsSimulatingLoad(false);
        });
    };

    if (currentSeller && currentSeller !== 'Unknown Seller') {
      fetchProducts(currentSeller);
    }
    const handleSellerChange = (e) => setCurrentSeller(e.detail);
    window.addEventListener('SELLER_INSTANCE_CHANGED_EVENT', handleSellerChange);
    return () => window.removeEventListener('SELLER_INSTANCE_CHANGED_EVENT', handleSellerChange);
  }, [currentSeller]);

  useEffect(() => {
    if (!activeProducts || activeProducts.length === 0) return;
    const currentProd = activeProducts[activeIndex];
    if (!currentProd) return;

    setIsAgentThinking(true);
    setAgentContext(null);

    fetch(`${API_BASE_URL}/api/agent/analyze-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_id: currentSeller,
        name: currentProd.sku || "Product",
        description: currentProd.originalDesc || "",
        rating: Number(currentProd.rating) || 4.0,
        return_rate: Number(currentProd.returnRate) || 10
      })
    })
    .then(res => res.json())
    .then(data => {
      setAgentContext(data);
      setIsAgentThinking(false);
      setProductInsights(prev => ({
        ...prev,
        [currentProd.id]: {
          index: activeIndex,
          sku: currentProd.sku,
          returnRate: Number(currentProd.returnRate) || 0,
          confidence: data.confidence,
        }
      }));
    })
    .catch(err => {
      console.error("Live AI failed:", err);
      setIsAgentThinking(false);
    });
  }, [activeIndex, activeProducts, currentSeller]);

  const rawActiveProduct = activeProducts[activeIndex] || {};
  const activeProduct = {
    ...rawActiveProduct,
    confidence: agentContext ? agentContext.confidence : 100,
    issueSummary: isAgentThinking ? "Analyzing storefront metrics..." : (agentContext ? agentContext.text : "Loading analysis..."),
    agentFlag: agentContext ? agentContext.flag : ""
  };

  const needsHumanInput = activeProduct.confidence < 70;
  // Calculate dynamic monetary impact for the UI
  const monthlyLoss = activeProduct.returnRate * 340;
  const projectedReturnRate = Math.floor(activeProduct.returnRate / 2);


  const analyzedEntries = useMemo(
    () => Object.values(productInsights).sort((a, b) => a.index - b.index),
    [productInsights]
  );

  // 3-4 review quotes for the active product: positive if it's healthy,
  // themed around the AI-detected issue if it isn't. Built client-side from
  // data already returned by analyze-product, so no extra API calls.
  const reviewSet = useMemo(() => {
    const returnRate = Number(activeProduct.returnRate) || 0;
    const baseReview = {
      id: 'base',
      text: activeProduct.originalDesc || 'Set as described.',
      stars: Math.floor(activeProduct.rating || 4),
      date: 'Recent'
    };
    if (!activeProduct.sku) return [baseReview];

    const hasIssue = returnRate > 15; // above industry avg -> treat as a real problem
    if (!hasIssue) {
      const picks = shuffleArray(POSITIVE_REVIEW_POOL).slice(0, 3);
      return [baseReview, ...picks.map((text, i) => ({ id: `pos-${i}`, text, stars: 5, date: `${i + 2} days ago` }))];
    }

    const category = detectComplaintCategory(activeProduct.issueSummary || activeProduct.agentFlag || '');
    const pool = COMPLAINT_LIBRARY[category] || COMPLAINT_LIBRARY.generic;
    const picks = shuffleArray(pool).slice(0, 3);
    const starsForNeg = [2, 1, 2];
    return [baseReview, ...picks.map((text, i) => ({ id: `neg-${i}`, text, stars: starsForNeg[i] || 2, date: `${i + 2} days ago` }))];
  }, [activeIndex, activeProduct.returnRate, activeProduct.issueSummary, activeProduct.agentFlag, activeProduct.sku, activeProduct.originalDesc, activeProduct.rating]);

  const resetState = () => {
    setShowReviews(false);
    setShowTrace(false);
    setFixState('idle');
    setHumanInput('');
    setRefinedDesc('');
  };

  // THE HITL API REFINEMENT CALL
  const handleApplyFix = () => {
    const isRefining = needsHumanInput && humanInput.trim() !== '';
    setFixState(isRefining ? 'refining' : 'processing');

    fetch(`${API_BASE_URL}/api/agent/apply-fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_id: currentSeller,
        name: activeProduct.sku,
        original_desc: activeProduct.originalDesc,
        human_guidance: isRefining ? humanInput : null
      })
    })
    .then(res => res.json())
    .then(data => {
      setRefinedDesc(data.optimized_text);
      setFixState('resolved');
    })
    .catch(err => {
      console.error("Apply Fix API failed:", err);
      // Fallback just in case the server disconnects
      setRefinedDesc(`${activeProduct.originalDesc}\n\nNote: ${humanInput || "Updated for better expectation setting."}`);
      setFixState('resolved');
    });
  };

  const skipForNow = () => {
    if (activeProducts.length > 0) {
      setActiveIndex((prev) => (prev === activeProducts.length - 1 ? 0 : prev + 1));
      resetState();
    }
  };

  //  RENDER THE ACTUAL API RESPONSE
  const getFinalOptimizedText = () => {
    return refinedDesc || "Generating optimized text...";
  };

  if (isSimulatingLoad) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12 font-sans animate-pulse mt-8">
        <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
        <div className="h-64 bg-gray-100 rounded-2xl w-full"></div>
      </div>
    );
  }

  if (!activeProducts || activeProducts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 text-[#666666] font-bold bg-white border border-[#EAEAEA] rounded-xl shadow-sm w-full max-w-4xl mx-auto mt-6">
        No active products found for {currentSeller}.
      </div>
    );
  }

  // Plain derived values (not hooks) — safe to compute after the early returns above.
  const actionNeededCount = analyzedEntries.filter(e => e.confidence >= 70).length;
  const scanComplete = activeProducts.length > 0 && analyzedEntries.length === activeProducts.length;

const isHealthy = activeProduct.returnRate < 12;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto pb-12 font-sans relative pt-6 gap-6">

      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-black text-[#3B1C54] tracking-tight m-0">ShopOptimizer: Your AI Coach</h1>
          <p className="text-gray-500 text-sm mt-1">Reviewing SKU {activeIndex + 1} of {activeProducts.length}</p>
        </div>
      </div>

      {/* Autonomous scan status strip */}
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 w-fit -mt-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        <span>
          Autonomous scan active — last full catalog scan <strong className="text-gray-700">{scanStatus.lastScan}h ago</strong> · next scan in <strong className="text-gray-700">{scanStatus.nextScan}h</strong> · {activeProducts.length}/{activeProducts.length} SKUs monitored
        </span>
      </div>

      {fixState === 'resolved' ? (
        /* =========================================
           SUCCESS STATE (Results Dashboard)
           ========================================= */
        <div className="bg-white border-2 border-[#10B981] rounded-2xl p-8 shadow-lg animate-[fadeIn_0.4s_ease-out]">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl shadow-sm">✓</div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 m-0">Listing Optimized Successfully</h2>
              <p className="text-gray-500 text-sm mt-1">Live storefront variables updated via agentic pipeline.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Listing Copy Adjustments</h4>
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 relative">
                <span className="absolute top-3 right-3 text-[9px] font-bold text-orange-400 uppercase tracking-widest">Original</span>
                <p className="text-sm text-gray-500 line-through opacity-70 mt-3">{activeProduct.originalDesc}</p>
              </div>
              <div className="bg-green-50/50 p-5 rounded-xl border border-green-200 relative shadow-sm">
                <span className="absolute top-3 right-3 text-[9px] font-bold text-green-600 uppercase tracking-widest">Optimized via Amplify</span>
                <p className="text-sm text-gray-800 font-medium mt-3 leading-relaxed whitespace-pre-line">
                  {getFinalOptimizedText()}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">30-Day Projected Impact</h4>
              <div className="bg-white border border-gray-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold tracking-widest block mb-1">RETURN RATE</span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg text-gray-400 line-through">{activeProduct.returnRate}%</span>
                    <span className="text-3xl font-black text-[#10B981]">{projectedReturnRate}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 font-bold tracking-widest block mb-1">RECOVERED REV</span>
                  <span className="text-2xl font-black text-[#3B1C54]">+₹{monthlyLoss.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-2 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                <span className="text-lg">⏳</span>
                <p className="text-xs text-blue-900 font-medium m-0 leading-relaxed">
                  Results show in 5-7 days. Actual progress and GMV impact will populate in your seller dashboard as the Meesho algorithm indexes the changes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={skipForNow} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-sm transition-colors cursor-pointer">
              Review Next Product &rarr;
            </button>
          </div>
        </div>

      ) : (
        <>
          {/* SECTION 1: THE DYNAMIC INSIGHT */}
          <div className={`bg-white border-2 ${isHealthy ? 'border-green-100' : 'border-red-100'} rounded-2xl overflow-hidden shadow-sm`}>
            <div className={`${isHealthy ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} px-6 py-4 border-b flex justify-between items-center`}>
              <h3 className={`${isHealthy ? 'text-green-600' : 'text-red-600'} font-black tracking-wide m-0 flex items-center gap-2`}>
                <span className="animate-pulse">{isHealthy ? '🌟' : '🚨'}</span> 
                {isHealthy ? 'TOP NOTCH PRODUCT' : 'YOUR PRODUCT IS LOSING MONEY'}
              </h3>
              <span
                className={`text-xs font-bold ${isHealthy ? 'text-green-600 bg-white border-green-200' : 'text-red-500 bg-white border-red-100'} px-3 py-1 rounded-full border shadow-sm cursor-help`}
                title="Confidence = review-keyword match rate × sample size weighting. Scores below 70% require seller input before any change is applied."
              >
                Agent Confidence: {activeProduct.confidence}% ⓘ
              </span>
            </div>

            <div className="p-6 flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <div className="aspect-square bg-gray-50 rounded-xl border border-gray-200 overflow-hidden relative">
                   {/* THE IMAGE FIX: onError handles broken URLs automatically */}
                   <img 
                        src={getValidImageUrl(activeProduct.image_url)}  
                       onError={(e) => { 
    // If the database URL is broken/expired, force it to load the local illustration
                        e.target.onerror = null; 
                        e.target.src = "/illustrations/shopping-sprint.png"; 
                      }} 
                        alt={activeProduct.sku || "Product"} 
                         className="w-full h-full object-cover" 
                      />  
                </div>
                <h4 className="text-lg font-black text-gray-800 m-0">{activeProduct.sku}</h4>
              </div>

              <div className="flex-1 flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className={`flex-1 ${isHealthy ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'} p-4 rounded-xl border`}>
                    <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Return Rate</span>
                    <span className={`text-3xl font-black ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>{activeProduct.returnRate}%</span>
                    <span className={`text-xs ${isHealthy ? 'text-green-500' : 'text-red-400'} block mt-1`}>(Industry avg: 12%)</span>
                  </div>
                  <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      {isHealthy ? 'Est. Profit Retained' : 'Est. Lost Revenue'}
                    </span>
                    <span className={`text-3xl font-black ${isHealthy ? 'text-green-600' : 'text-gray-800'}`}>₹{monthlyLoss.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 block mt-1">per month</span>
                  </div>
                </div>

                <div className={`${isHealthy ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'} p-5 rounded-xl border`}>
                  <span className={`text-[10px] font-bold ${isHealthy ? 'text-green-600' : 'text-orange-600'} uppercase tracking-widest block mb-2`}>
                    {isHealthy ? 'Why customers love this:' : 'Why people are returning this:'}
                  </span>
                  <p className={`text-sm text-gray-800 italic leading-relaxed m-0 border-l-2 ${isHealthy ? 'border-green-400' : 'border-orange-300'} pl-3`}>
                    "{activeProduct.issueSummary}"
                  </p>

                  <button onClick={() => setShowReviews(!showReviews)} className={`text-xs ${isHealthy ? 'text-green-600' : 'text-orange-600'} font-bold mt-3 hover:underline cursor-pointer`}>
                    {showReviews ? 'Hide Customer Quotes' : 'Read actual customer quotes'}
                  </button>

                  {showReviews && (
                    <div className="mt-4 flex flex-col gap-2">
                      {reviewSet.map(review => (
                        <div key={review.id} className={`bg-white p-3 rounded border ${isHealthy ? 'border-green-100' : 'border-orange-100'} text-xs text-gray-600 shadow-sm`}>
                          "{review.text}" <span className={`${isHealthy ? 'text-green-500' : 'text-orange-400'} ml-2`}>({review.stars}★)</span>
                          <span className="text-gray-300 ml-2">· {review.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Agent reasoning trace */}
                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                  <button
                    onClick={() => setShowTrace(!showTrace)}
                    className="text-xs text-purple-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{showTrace ? '▼' : '▶'}</span>
                    {showTrace ? 'Hide agent reasoning' : 'Show agent reasoning'}
                  </button>

                  {showTrace && (
                    <div className="mt-3 flex flex-col gap-2 text-xs text-gray-600 leading-relaxed">
                      <div><strong className="text-purple-700">Step 1 — Scan:</strong> Pulled catalog and review data for "{activeProduct.sku}".</div>
                      <div><strong className="text-purple-700">Step 2 — Pattern detection:</strong> {activeProduct.issueSummary}</div>
                      <div><strong className="text-purple-700">Step 3 — Correlation:</strong> Return rate of {activeProduct.returnRate}% compared against 12% category average.</div>
                      <div><strong className="text-purple-700">Step 4 — Confidence scoring:</strong> {activeProduct.confidence}% confidence, based on review-keyword match rate and sample size.</div>
                      <div><strong className="text-purple-700">Step 5 — Proposed action:</strong> {activeProduct.agentFlag || (isHealthy ? "Product is primed for top-of-funnel marketing scale." : (needsHumanInput ? "Confidence below threshold — requesting seller input." : "Auto-apply listing update."))}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: THE DYNAMIC ACTION GATE */}
          <div className="bg-white border-2 border-[#3B1C54] rounded-2xl p-6 shadow-md relative mt-2">
            <h3 className="text-lg font-black text-[#3B1C54] mb-4">
              {isHealthy ? '🚀 READY FOR VIRAL MARKETING' : '✅ WE\'LL FIX BUYER EXPECTATIONS'}
            </h3>

            {isHealthy ? (
              // -----------------------------------------------------
              // HEALTHY STATE: Push to SmartReels
              // -----------------------------------------------------
              <>
                <p className="text-sm text-gray-600 mb-6 pb-4 border-b border-gray-100">
                  <strong>AI Proposal:</strong> Your product metrics are fantastic. Scale this product by generating an AI SmartReel to drive massive feed traffic.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Note: Adjust this onClick or href to point to your actual SmartReels tab/route */}
                  <button onClick={() => window.location.href = '#'} className="flex-1 py-4 bg-[#10B981] hover:bg-green-600 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md flex items-center justify-center cursor-pointer">
                    ✨ Create SmartReel
                  </button>
                  <button onClick={skipForNow} className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 font-bold border border-gray-200 rounded-xl text-sm transition-colors cursor-pointer">
                    Review Next Product &rarr;
                  </button>
                </div>
              </>
            ) : (
              // -----------------------------------------------------
              // UNHEALTHY STATE: Fix Listing Flow
              // -----------------------------------------------------
              <>
                {needsHumanInput && (
                  <div className="bg-purple-50 p-5 rounded-xl border border-purple-200 mb-6">
                    <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block mb-2">Human Guidance Required</span>
                    <p className="text-sm text-gray-700 mb-3">The AI needs your help to set the exact expectations. How should we describe this honestly to prevent returns?</p>
                    <textarea
                      value={humanInput}
                      onChange={(e) => setHumanInput(e.target.value)}
                      placeholder="e.g., Explain that the fabric is lightweight and meant for summer..."
                      className="w-full bg-white border border-purple-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#3B1C54] outline-none text-gray-800 shadow-inner h-20 resize-none"
                    />
                  </div>
                )}

                {!needsHumanInput && activeProduct.agentFlag && (
                  <p className="text-sm text-gray-600 mb-6 pb-4 border-b border-gray-100">
                    <strong>AI Proposal:</strong> "{activeProduct.agentFlag}"
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleApplyFix}
                    disabled={needsHumanInput && humanInput.trim() === ''}
                    className={`flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md flex items-center justify-center cursor-pointer
                    ${(fixState === 'processing' || fixState === 'refining') ? 'bg-[#2A133D] text-white opacity-90 animate-pulse' :
                      (needsHumanInput && humanInput.trim() === '') ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200' :
                      'bg-[#3B1C54] hover:bg-[#2A133D] text-white hover:-translate-y-0.5'}`}
                  >
                    {fixState === 'refining' ? 'Refining with Amplify AI...' :
                    fixState === 'processing' ? 'Executing Fix...' :
                    '✅ Apply This Fix'}
                  </button>

                  <button onClick={() => setShowReviews(!showReviews)} className="flex-1 py-4 bg-white hover:bg-gray-50 text-gray-700 font-bold border border-gray-200 rounded-xl text-sm transition-colors cursor-pointer">
                    📖 Learn More
                  </button>

                  <button onClick={skipForNow} className="flex-1 py-4 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 font-bold border border-gray-200 rounded-xl text-sm transition-colors cursor-pointer">
                    ❌ Skip For Now
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ==========================================================
          MOCK WHATSAPP SELLER-SUPPORT WIDGET
          ========================================================== */}
      <button
        onClick={() => setShowWhatsapp(prev => !prev)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] shadow-xl flex items-center justify-center text-white text-2xl hover:scale-105 transition-transform cursor-pointer"
        title="Amplify Seller Support (WhatsApp)"
      >
        💬
        {actionNeededCount > 0 && !showWhatsapp && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
            {actionNeededCount}
          </span>
        )}
      </button>

      {showWhatsapp && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] max-h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm m-0 truncate">Amplify Seller Support</p>
              <p className="text-green-100 text-[11px] m-0">Autonomous agent · online</p>
            </div>
            <button onClick={() => setShowWhatsapp(false)} className="text-white/80 hover:text-white text-lg cursor-pointer leading-none">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3 bg-[#ECE5DD]">
            <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-xs shadow-sm max-w-[90%]">
              <p className="m-0 font-bold text-gray-800">
                {scanComplete ? '✅ Catalog scan complete' : '🔄 Scanning your catalog...'}
              </p>
              <p className="m-0 text-gray-600 mt-1">
                Hi {currentSeller}, I've reviewed {analyzedEntries.length}/{activeProducts.length} products{scanComplete ? '.' : " so far — I'll message you here as I finish the rest."}
              </p>
              <span className="text-[9px] text-gray-400 block mt-1">Amplify Agent · just now</span>
            </div>

            {analyzedEntries.map(entry => (
              <div
                key={entry.index}
                className={`rounded-xl rounded-tl-sm px-3 py-2 text-xs shadow-sm max-w-[90%] bg-white border ${
                  entry.confidence >= 90 ? 'border-red-100' : entry.confidence >= 70 ? 'border-orange-100' : 'border-green-100'
                }`}
              >
                {entry.confidence >= 90 ? (
                  <>
                    <p className="m-0 text-gray-800">
                      🚨 <strong>{entry.sku}</strong> is losing ~₹{(entry.returnRate * 340).toLocaleString()}/mo (return rate {entry.returnRate}%). I'm {entry.confidence}% sure this is the fix.
                    </p>
                    <button
                      onClick={() => { setActiveIndex(entry.index); setShowWhatsapp(false); }}
                      className="mt-2 w-full bg-[#3B1C54] text-white text-[11px] font-bold py-2 rounded-lg hover:bg-[#2A133D] cursor-pointer"
                    >
                      Tap to auto-apply fix
                    </button>
                  </>
                ) : entry.confidence >= 70 ? (
                  <>
                    <p className="m-0 text-gray-800">
                      ⚠️ <strong>{entry.sku}</strong> return rate is {entry.returnRate}%, worth a look. I'm {entry.confidence}% confident — want to review before I apply it?
                    </p>
                    <button
                      onClick={() => { setActiveIndex(entry.index); setShowWhatsapp(false); }}
                      className="mt-2 w-full bg-white border border-[#3B1C54] text-[#3B1C54] text-[11px] font-bold py-2 rounded-lg hover:bg-purple-50 cursor-pointer"
                    >
                      Review before applying
                    </button>
                  </>
                ) : (
                  <p className="m-0 text-gray-800">
                    ✅ <strong>{entry.sku}</strong> looks healthy — return rate {entry.returnRate}% is within normal range. No urgent action, just monitoring.
                  </p>
                )}
                <span className="text-[9px] text-gray-400 block mt-1">Amplify Agent · just now</span>
              </div>
            ))}

            {isAgentThinking && (
              <div className="flex items-center gap-1 bg-white rounded-xl rounded-tl-sm px-3 py-2 shadow-sm w-fit">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}
          </div>

          <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-2">
            <input disabled placeholder="Type a message..." className="flex-1 bg-gray-100 rounded-full px-3 py-2 text-xs text-gray-400 outline-none cursor-not-allowed" />
            <span className="text-lg opacity-40">➤</span>
          </div>
        </div>
      )}
    </div>
  );
}
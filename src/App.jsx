import React, { useState, useEffect } from 'react';
import HomeOverview from './pages/HomeOverview';
import ShopOptimizer from './pages/ShopOptimizer';
import SmartReelsStudio from './pages/SmartReelsStudio';
import LiveCopilotConsole from './pages/LiveCopilotConsole';
import LiveViewerSandbox from './pages/LiveViewerSandbox'; // ADDED NEW PAGE
import { API_BASE_URL } from './config';

export default function App() {
  // ⚡ NATIVE ROUTING INTERCEPTOR: Check if we are on the Judge's shared link
  const currentPath = window.location.pathname;

  const [activeTab, setActiveTab] = useState('home');
  const [sellerId, setSellerId] = useState(() => localStorage.getItem('SELECTED_SELLER_NAME') || '');
  const [sellers, setSellers] = useState([]);
  const [sellersStatus, setSellersStatus] = useState('loading');
  
  // 1. GLOBAL REGISTRATION MODAL STATES (Now including image_url)
  const [showRegModal, setShowRegModal] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [prod1, setProd1] = useState({ name: "", desc: "", return_rate: 35, rating: 3.1, image_url: "" });
  const [prod2, setProd2] = useState({ name: "", desc: "", return_rate: 15, rating: 4.2, image_url: "" });

  // 2. FETCH BACKGROUND SELLERS FROM NEON DB
  const fetchDatabaseSellers = async (signal = null) => {
    const fetchOptions = signal ? { signal } : {};
    try {
      const res = await fetch(`${API_BASE_URL}/api/sellers`, fetchOptions);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid sellers payload');
      
      // Strip duplicates and cap at 50 to keep UI clean
      const completelyUniqueSellers = [...new Set(data)].sort((a, b) => a.localeCompare(b)).slice(0, 50);
      
      setSellers(completelyUniqueSellers);
      setSellersStatus('ready');
      return completelyUniqueSellers;
    } catch (err) {
      if (err.name === 'AbortError') return [];
      console.error('Failed to load sellers from Neon DB:', err);
      setSellersStatus('error');
      return [];
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const initializeSellers = async () => {
      const uniqueSellers = await fetchDatabaseSellers(controller.signal);
      const stored = localStorage.getItem('SELECTED_SELLER_NAME');
      
      if (stored && uniqueSellers.includes(stored)) {
        setSellerId(stored);
      } else if (uniqueSellers.length > 0) {
        setSellerId(uniqueSellers[0]);
        localStorage.setItem('SELECTED_SELLER_NAME', uniqueSellers[0]);
      }
    };
    initializeSellers();
    return () => controller.abort();
  }, []);

  const handleSellerChange = (e) => {
    const selectedValue = e.target.value;
    setSellerId(selectedValue);
    localStorage.setItem('SELECTED_SELLER_NAME', selectedValue);
    window.dispatchEvent(new CustomEvent('SELLER_INSTANCE_CHANGED_EVENT', { detail: selectedValue }));
  };

  // 3. GLOBAL SUBMISSION HANDLER (Now passing the image_url to the backend)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    const payload = {
      shop_name: newShopName,
      products: [
        { name: prod1.name, description: prod1.desc, return_rate: Number(prod1.return_rate), rating: Number(prod1.rating), image_url: prod1.image_url || "/illustrations/shopping-sprint.png" },
        { name: prod2.name, description: prod2.desc, return_rate: Number(prod2.return_rate), rating: Number(prod2.rating), image_url: prod2.image_url || "/illustrations/content-woman.png" }
      ].filter(p => p.name.trim() !== "")
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/sellers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem('SELECTED_SELLER_NAME', result.seller_id);
        setSellerId(result.seller_id);
        
        fetchDatabaseSellers(); // Refresh dropdown list instantly
        window.dispatchEvent(new CustomEvent('SELLER_INSTANCE_CHANGED_EVENT', { detail: result.seller_id }));
        alert(`🎉 Success! Active sandbox seeded for "${newShopName}".`);
      }
    } catch (err) {
      console.error("Registration failed:", err);
      alert("Error registering test seller.");
    }

    setShowRegModal(false);
    setNewShopName("");
    setProd1({ name: "", desc: "", return_rate: 35, rating: 3.1, image_url: "" });
    setProd2({ name: "", desc: "", return_rate: 15, rating: 4.2, image_url: "" });
  };

  // ⚡ IF ON /VIEWER, RENDER ONLY THE SANDBOX (Bypassing main dashboard)
  if (currentPath === '/viewer') {
    return <LiveViewerSandbox />;
  }

  // STANDARD DASHBOARD RENDER
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3436] flex flex-col font-sans antialiased">
      
      {/* GLOBAL HEADER */}
      <header className="bg-white border-b border-[#EAEAEA] px-8 py-3.5 sticky top-0 z-50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span onClick={() => setActiveTab('home')} className="text-3xl font-black text-[#9F206C] tracking-tighter cursor-pointer select-none leading-none">
            meesho
          </span>
          <span className="text-[11px] font-bold tracking-wider rounded bg-[#3B1C54] text-white px-3 py-1 leading-tight">
            AMPLIFY AI COACH
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowRegModal(true)} className="bg-[#3B1C54] hover:bg-[#2A133D] text-white font-bold py-1.5 px-3 rounded text-xs transition-colors cursor-pointer">
            ➕ Become a Seller / Test App
          </button>
          <div className="h-5 w-[1px] bg-[#EAEAEA] mx-1"></div>
          <select value={sellerId} onChange={handleSellerChange} className="border border-[#EAEAEA] rounded px-3 py-1.5 text-xs font-semibold text-[#3B1C54] bg-[#F8F9FA] outline-none cursor-pointer max-w-[200px]">
            {sellersStatus === 'loading' ? <option value="">Loading sellers…</option> : 
             sellers.length === 0 ? <option value="">No sellers found</option> : 
             sellers.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          <div className="w-8 h-8 rounded-full bg-[#9F206C] text-white flex items-center justify-center font-bold text-xs shadow-sm uppercase">
            {sellerId ? sellerId.replace("SELLER_", "").charAt(0) : '?'}
          </div>
        </div>
      </header>

      {/* MAIN HUB WORKSPACE GRID */}
      <div className="flex flex-1">
        <aside className="w-64 border-r border-[#EAEAEA] bg-white p-5 flex flex-col gap-1.5 shrink-0">
          <button onClick={() => setActiveTab('home')} className={`w-full text-left px-4 py-3 text-sm font-semibold rounded ${activeTab === 'home' ? 'bg-[#9F206C] text-white shadow-sm' : 'text-[#666666] hover:bg-[#F8F9FA]'}`}>🏠 Hub Overview Home</button>
          <div className="text-[10px] font-bold text-[#3B1C54]/40 uppercase tracking-widest px-4 pt-6 pb-2">Operational Viewports</div>
          <button onClick={() => setActiveTab('optimizer')} className={`w-full text-left px-4 py-3 text-sm font-semibold rounded ${activeTab === 'optimizer' ? 'bg-[#9F206C] text-white shadow-sm' : 'text-[#666666] hover:bg-[#F8F9FA]'}`}>🏥 ShopOptimizer</button>
          <button onClick={() => setActiveTab('reels')} className={`w-full text-left px-4 py-3 text-sm font-semibold rounded ${activeTab === 'reels' ? 'bg-[#9F206C] text-white shadow-sm' : 'text-[#666666] hover:bg-[#F8F9FA]'}`}>🎬 SmartReels Studio</button>
          <button onClick={() => setActiveTab('copilot')} className={`w-full text-left px-4 py-3 text-sm font-semibold rounded ${activeTab === 'copilot' ? 'bg-[#9F206C] text-white shadow-sm' : 'text-[#666666] hover:bg-[#F8F9FA]'}`}>🎙️ Live Co-Pilot Console</button>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto bg-[#F8F9FA]">
          {activeTab === 'home' && <HomeOverview onNavigate={setActiveTab} />}
          {activeTab === 'optimizer' && <ShopOptimizer />}
          
          {/* FUTURE SMART REELS STUDIO SPACE */}
          {activeTab === 'reels' && <SmartReelsStudio />}
          
          {activeTab === 'copilot' && <LiveCopilotConsole />}
        </main>
      </div>

      {/* UNIFIED GLOBAL REGISTRATION MODAL OVERLAY */}
      {showRegModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4 backdrop-blur-sm">
          <form onSubmit={handleRegisterSubmit} className="bg-white rounded-2xl p-8 max-w-[700px] w-full max-h-[90vh] overflow-y-auto flex flex-col gap-6 border border-[#EAEAEA] shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-[#EAEAEA] pb-4">
              <h3 className="m-0 text-xl font-bold text-[#3B1C54]">Interactive Sandbox: Seed Demo Store</h3>
              <button type="button" className="text-3xl text-[#666666] hover:text-black leading-none bg-transparent border-none cursor-pointer" onClick={() => setShowRegModal(false)}>&times;</button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#3B1C54] uppercase">Shopkeeper Platform Name</label>
              <input type="text" required placeholder="e.g., Sharma Handlooms Surat" value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="w-full p-3 rounded-lg border border-[#EAEAEA] outline-none text-sm focus:border-[#9F206C] transition-colors bg-[#F8F9FA]" />
            </div>

            {/* Product 1 Input Block */}
            <div className="border border-[#EAEAEA] p-5 rounded-xl bg-[#F8F9FA] flex flex-col gap-4">
              <span className="text-xs font-bold text-[#9F206C] uppercase">Product Dispatch Vector #1 (Required)</span>
              <input type="text" required placeholder="Product Title (e.g., Blue Cotton Kurta)" value={prod1.name} onChange={(e) => setProd1({...prod1, name: e.target.value})} className="w-full p-3 rounded-lg border border-[#EAEAEA] text-sm focus:border-[#9F206C] outline-none" />
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#666666] uppercase">Return Rate (%)</label>
                  <input type="number" required value={prod1.return_rate} onChange={(e) => setProd1({...prod1, return_rate: e.target.value})} className="w-full p-3 rounded-lg border border-[#EAEAEA] text-sm focus:border-[#9F206C] outline-none" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#666666] uppercase">Rating (1.0 - 5.0)</label>
                  <input type="number" step="0.1" required value={prod1.rating} onChange={(e) => setProd1({...prod1, rating: e.target.value})} className="w-full p-3 rounded-lg border border-[#EAEAEA] text-sm focus:border-[#9F206C] outline-none" />
                </div>
              </div>
              
              {/* IMAGE INPUT FIELD 1 */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-bold text-[#666666] uppercase">Product Image URL (Optional)</label>
                <input type="text" placeholder="e.g., https://images.unsplash.com/photo-..." value={prod1.image_url} onChange={(e) => setProd1({...prod1, image_url: e.target.value})} className="w-full p-3 rounded-lg border border-[#EAEAEA] text-sm focus:border-[#9F206C] outline-none" />
              </div>

              <textarea required placeholder="Paste simulated customer complaints or listing context here to test the AI evaluation..." value={prod1.desc} onChange={(e) => setProd1({...prod1, desc: e.target.value})} className="w-full h-20 p-3 rounded-lg border border-[#EAEAEA] text-sm outline-none resize-none focus:border-[#9F206C]" />
            </div>

            {/* Product 2 Input Block */}
            <div className="border border-[#EAEAEA] p-5 rounded-xl bg-[#F8F9FA] flex flex-col gap-4">
              <span className="text-xs font-bold text-[#9F206C] uppercase">Product Dispatch Vector #2 (Optional)</span>
              <input type="text" placeholder="Product Title (e.g., Pink Silk Saree)" value={prod2.name} onChange={(e) => setProd2({...prod2, name: e.target.value})} className="w-full p-3 rounded-lg border border-[#EAEAEA] text-sm focus:border-[#9F206C] outline-none" />
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#666666] uppercase">Return Rate (%)</label>
                  <input type="number" value={prod2.return_rate} onChange={(e) => setProd2({...prod2, return_rate: e.target.value})} className="w-full p-3 rounded-lg border border-[#EAEAEA] text-sm focus:border-[#9F206C] outline-none" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#666666] uppercase">Rating (1.0 - 5.0)</label>
                  <input type="number" step="0.1" value={prod2.rating} onChange={(e) => setProd2({...prod2, rating: e.target.value})} className="w-full p-3 rounded-lg border border-[#EAEAEA] text-sm focus:border-[#9F206C] outline-none" />
                </div>
              </div>

              {/* IMAGE INPUT FIELD 2 */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-bold text-[#666666] uppercase">Product Image URL (Optional)</label>
                <input type="text" placeholder="e.g., https://images.unsplash.com/photo-..." value={prod2.image_url} onChange={(e) => setProd2({...prod2, image_url: e.target.value})} className="w-full p-3 rounded-lg border border-[#EAEAEA] text-sm focus:border-[#9F206C] outline-none" />
              </div>

              <textarea placeholder="Paste simulated customer complaints or listing context here to test the AI evaluation..." value={prod2.desc} onChange={(e) => setProd2({...prod2, desc: e.target.value})} className="w-full h-20 p-3 rounded-lg border border-[#EAEAEA] text-sm outline-none resize-none focus:border-[#9F206C]" />
            </div>

            <button type="submit" className="w-full bg-[#3B1C54] hover:bg-[#2A133D] text-white font-bold py-4 rounded-xl text-sm transition-colors cursor-pointer mt-2 shadow-md">
               Sync & Populate Neon DB Compute Tiers
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
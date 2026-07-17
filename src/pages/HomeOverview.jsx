import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

export default function HomeOverview({ onNavigate }) {
  const [returnReduction, setReturnReduction] = useState(0);
  const [sellerGrowth, setSellerGrowth] = useState(0);
  const hasAnimatedRef = useRef(false); 
  const surveySectionRef = useRef(null);

  // New Registration Modal States
  const [showRegModal, setShowRegModal] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [prod1, setProd1] = useState({ name: "", desc: "", return_rate: 35, rating: 3.1, img: "/illustrations/shopping-sprint.png" });
  const [prod2, setProd2] = useState({ name: "", desc: "", return_rate: 15, rating: 4.2, img: "/illustrations/content-woman.png" });

  const colors = {
    magenta: "#9F206C",
    purple: "#3B1C54",
    pinkBg: "#FDF0F6",
    accent: "#F89A1C",
    border: "#EAEAEA",
    surface: "#F8F9FA",
    white: "#FFFFFF",
    pureWhiteText: "#FFFFFF",
    textDark: "#2D3436",
    textMuted: "#666666"
  };

  // Listen for Top Navbar button clicks to open the modal
  useEffect(() => {
    const handleOpenModal = () => setShowRegModal(true);
    window.addEventListener('TRIGGER_SELLER_REGISTRATION_MODAL', handleOpenModal);
    return () => window.removeEventListener('TRIGGER_SELLER_REGISTRATION_MODAL', handleOpenModal);
  }, []);

  // Post the live storefront details out to Neon DB compute tiers
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    const payload = {
      shop_name: newShopName,
      products: [
        { name: prod1.name, description: prod1.desc, return_rate: Number(prod1.return_rate), rating: Number(prod1.rating), image_url: prod1.img },
        { name: prod2.name, description: prod2.desc, return_rate: Number(prod2.return_rate), rating: Number(prod2.rating), image_url: prod2.img }
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
        window.dispatchEvent(new CustomEvent('SELLER_DATABASE_MUTATION_COMPLETE', { detail: result.seller_id }));
      }
    } catch (err) {
      console.error("Registration failed:", err);
    }

    setShowRegModal(false);
    setNewShopName("");
    setProd1({ name: "", desc: "", return_rate: 35, rating: 3.1, img: "/illustrations/shopping-sprint.png" });
    setProd2({ name: "", desc: "", return_rate: 15, rating: 4.2, img: "/illustrations/content-woman.png" });
  };

  // Precise 20-Second Progressive Increment Counter Loop
  useEffect(() => {
    let timer;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true; 
          
          let currentStep = 0;
          const totalSteps = 40; 
          const totalDurationMs = 1000; 
          const stepIntervalMs = totalDurationMs / totalSteps; 
          
          const returnTarget = 22;
          const growthTarget = 45;

          timer = setInterval(() => {
            currentStep += 1;
            
            const nextReturn = Math.min(Math.floor((currentStep / totalSteps) * returnTarget), returnTarget);
            const nextGrowth = Math.min(Math.floor((currentStep / totalSteps) * growthTarget), growthTarget);
            
            setReturnReduction(nextReturn);
            setSellerGrowth(nextGrowth);

            if (currentStep >= totalSteps) {
              clearInterval(timer);
            }
          }, stepIntervalMs);
        }
      },
      { threshold: 0.15 } 
    );

    if (surveySectionRef.current) {
      observer.observe(surveySectionRef.current);
    }

    return () => {
      observer.disconnect();
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '56px', padding: '8px', boxSizing: 'border-box' }}>
      
      {/* 1. BRAND MANAGER HERO BANNER */}
      <section style={{ background: `linear-gradient(135deg, ${colors.magenta} 0%, ${colors.purple} 100%)`, borderRadius: '16px', padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '48px', boxShadow: '0 10px 30px rgba(159,32,108,0.12)', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <span style={{ alignSelf: 'flex-start', backgroundColor: colors.accent, color: colors.pureWhiteText, fontSize: '11px', fontWeight: 'bold', padding: '5px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            AMPLIFY SELLER INTELLIGENCE
          </span>
          <h1 style={{ margin: 0, fontSize: '42px', fontWeight: '800', color: colors.pureWhiteText, lineHeight: '1.2', fontFamily: 'Poppins, sans-serif' }}>
            Autonomous AI Layer Built to Turn Diagnostics Into Action
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.6', maxWidth: '560px' }}>
            Stop chasing manual operational metrics. AMPLIFY monitors inventory pipelines silently, structures unstructured feedback, updates text listings, and prevents revenue drops automatically.
          </p>
        </div>
        <div className="animate-float" style={{ width: '320px', height: '280px', backgroundColor: '#FFFBF7', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', boxSizing: 'border-box', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <img src="/illustrations/shopping-woman.png" alt="AI Growth Context Anchor" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.05)' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
      </section>

      {/* 2. THREE CORE CAPABILITY FEATURES */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: colors.purple, fontFamily: 'Poppins, sans-serif' }}>Active AI Engine Features</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: colors.textMuted }}>Seamlessly switch capabilities to explore how your proactive automated layer drives store performance.</p>
        </div>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'space-between', flexWrap: 'nowrap', width: '100%' }}>
          <FeatureCard icon="🛍️" title="ShopOptimizer" desc="Scans raw customer return reviews to extract underlying product complaints and generates listing description corrections." btnText="Launch Diagnostics" onClick={() => onNavigate('optimizer')} themeColors={colors} />
          <FeatureCard icon="🎬" title="SmartReels Studio" desc="Pinpoints specific storefront item media deficits and compiles custom localized scripting sets to boost viewer conversion rates." btnText="Launch Content Engine" onClick={() => onNavigate('reels')} themeColors={colors} />
          <FeatureCard icon="🎙️" title="Live Co-Pilot" desc="Tracks streaming discussion text arrays in real-time, matching target buyer signals to serve high-contrast overlay sales cues." btnText="Launch Stream Terminal" onClick={() => onNavigate('copilot')} themeColors={colors} />
        </div>
      </section>

      {/* 3. SURVEY POTENTIAL IMPACT ROW */}
      <section ref={surveySectionRef} style={{ backgroundColor: colors.white, border: `2px solid ${colors.purple}`, borderRadius: '16px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px', boxShadow: '0 4px 12px rgba(59,28,84,0.02)' }}>
        <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: colors.purple, fontFamily: 'Poppins, sans-serif' }}>Project Potential Impact Survey Projections</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMuted }}>Empirical store efficiency parameters monitored across initial automated listing updates.</p>
        </div>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', width: '100%' }}>
          <div style={{ flex: '1 1 45%', border: `2px solid ${colors.purple}33`, padding: '28px', borderRadius: '12px', backgroundColor: colors.white, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: colors.purple }}>Customer Return Reduction Pulse</span>
              <span style={{ fontSize: '42px', fontWeight: '900', color: colors.magenta, fontFamily: 'monospace' }}>-{returnReduction}%</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: colors.textDark, lineHeight: '1.6' }}>Optimized listing content details prevent ordering uncertainty metrics, reducing total catalog product return triggers cleanly by 22%.</p>
          </div>
          <div style={{ flex: '1 1 45%', border: `2px solid ${colors.purple}33`, padding: '28px', borderRadius: '12px', backgroundColor: colors.white, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: colors.purple }}>Seller GMV Revenue Jump Velocity</span>
              <span style={{ fontSize: '42px', fontWeight: '900', color: colors.magenta, fontFamily: 'monospace' }}>+{sellerGrowth}%</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: colors.textDark, lineHeight: '1.6' }}>Replacing passive tracking views with 1-click execution updates shortens processing cycles, improving merchant conversions by 45%.</p>
          </div>
        </div>
      </section>

      {/* 4. THE ECOSYSTEM FLYWHEEL MOAT */}
      <section style={{ backgroundColor: colors.white, border: `2px solid ${colors.purple}`, borderRadius: '16px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 4px 12px rgba(59,28,84,0.02)' }}>
        <div style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: colors.purple, fontFamily: 'Poppins, sans-serif' }}>The Strategic Ecosystem Flywheel</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMuted }}>How a single autonomous optimization layer creates a continuous win-win-win cycle across the entire marketplace platform.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
          <div style={{ border: `1px solid ${colors.purple}22`, padding: '24px', borderRadius: '12px', backgroundColor: '#F7F0FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}><span style={{ fontSize: '24px' }}>🛍️</span><h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: colors.purple }}>Customer Certainty</h4></div>
            <p style={{ margin: 0, fontSize: '12px', color: colors.textDark, lineHeight: '1.6' }}>Interactive video descriptions and accurate sizing contexts remove purchase hesitation, fostering immediate checkout confidence.</p>
          </div>
          <div style={{ border: `1px solid ${colors.purple}22`, padding: '24px', borderRadius: '12px', backgroundColor: '#F2E5FB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}><span style={{ fontSize: '24px' }}>🏪</span><h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: colors.purple }}>Seller Retention</h4></div>
            <p style={{ margin: 0, fontSize: '12px', color: colors.textDark, lineHeight: '1.6' }}>Lower logistics return costs instantly stabilize profit margins. Positive storefront feedback builds organic ranking placement.</p>
          </div>
          <div style={{ border: `1px solid ${colors.purple}22`, padding: '24px', borderRadius: '12px', backgroundColor: '#F0EBFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}><span style={{ fontSize: '24px' }}>📈</span><h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: colors.purple }}>Meesho Marketplace Scale</h4></div>
            <p style={{ margin: 0, fontSize: '12px', color: colors.textDark, lineHeight: '1.6' }}>Reducing overall platform return metrics drops reverse-logistics overhead costs while higher trust drives customer repeat purchases.</p>
          </div>
          <div style={{ border: `1px solid ${colors.purple}22`, padding: '24px', borderRadius: '12px', backgroundColor: '#F8EEFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}><span style={{ fontSize: '24px' }}>📈</span><h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: colors.purple }}>Marketplace Adoption Momentum</h4></div>
            <p style={{ margin: 0, fontSize: '12px', color: colors.textDark, lineHeight: '1.6' }}>Faster seller onboarding and smarter catalog signals help more storefronts activate product promotions sooner.</p>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer style={{ marginTop: '56px', display: 'flex', flexDirection: 'column', gap: '0px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', minHeight: '140px', height: '140px', backgroundColor: '#F7F0FF', backgroundImage: 'url(/illustrations/meesho-logistics-footer.png)', backgroundSize: 'cover', backgroundPosition: 'center bottom', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: colors.purple }}></div>
        </div>
        <div style={{ backgroundColor: colors.purple, padding: '32px 40px', borderRadius: '0 0 16px 16px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '18px', fontWeight: '800', color: '#F89A1C', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Built for Meesho Sellers • Scripted By Her 2.0 Prototype Sprint</span>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', fontWeight: '500', letterSpacing: '0.5px' }}>Empowering 15M+ Indian Micro-Entrepreneurs via Autonomous Agentic Intelligence Layers</span>
          </div>
          <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
            <span>© 2026 AMPLIFY Ecosystem Co-Pilot.</span>
            <div style={{ display: 'flex', gap: '16px', fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
              <span>Neon Cloud PostgreSQL Database Stack</span>
              <span>•</span>
              <span>Gemini 2.5 Operational Schema Engines</span>
              <span>•</span>
              <span>FastAPI Architecture Ports</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 6. REGISTRATION OVERLAY FORM MODAL (New Metrics Hooked to Live Database) */}
      {showRegModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <form onSubmit={handleRegisterSubmit} style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '32px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', border: `1px solid ${colors.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: colors.purple }}>Interactive Sandbox: Seed Demo Store</h3>
              <span style={{ cursor: 'pointer', fontSize: '24px', color: colors.textMuted }} onClick={() => setShowRegModal(false)}>&times;</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: colors.purple }}>SHOPKEEPER PLATFORM NAME</label>
              <input type="text" required placeholder="e.g., Sharma Handlooms Surat" value={newShopName} onChange={(e) => setNewShopName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${colors.border}`, outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>

            {/* Product 1 Input Block */}
            <div style={{ border: `1px solid ${colors.border}`, padding: '14px', borderRadius: '8px', backgroundColor: colors.surface }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: colors.magenta, display: 'block', marginBottom: '8px' }}>PRODUCT DISPATCH VECTOR #1 (Required)</span>
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <input type="text" required placeholder="Product Title" value={prod1.name} onChange={(e) => setProd1({...prod1, name: e.target.value})} style={{ flex: '1 1 100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textMuted }}>RETURN RATE (%)</label>
                  <input type="number" required value={prod1.return_rate} onChange={(e) => setProd1({...prod1, return_rate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textMuted }}>RATING (1.0 - 5.0)</label>
                  <input type="number" step="0.1" required value={prod1.rating} onChange={(e) => setProd1({...prod1, rating: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textMuted }}>DISPLAY IMAGE</label>
                  <select value={prod1.img} onChange={(e) => setProd1({...prod1, img: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px', color: colors.purple, boxSizing: 'border-box' }}>
                    <option value="/illustrations/shopping-sprint.png">Shopping Sprint Graphic</option>
                    <option value="/illustrations/content-woman.png">Content Creator Graphic</option>
                    <option value="/illustrations/worker-catalog.png">Logistics Box Graphic</option>
                  </select>
                </div>
              </div>
              <textarea required placeholder="Paste simulated customer complaints or listing context here to test the AI evaluation..." value={prod1.desc} onChange={(e) => setProd1({...prod1, desc: e.target.value})} style={{ width: '100%', height: '60px', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Product 2 Input Block */}
            <div style={{ border: `1px solid ${colors.border}`, padding: '14px', borderRadius: '8px', backgroundColor: colors.surface }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: colors.magenta, display: 'block', marginBottom: '8px' }}>PRODUCT DISPATCH VECTOR #2 (Optional)</span>
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Product Title" value={prod2.name} onChange={(e) => setProd2({...prod2, name: e.target.value})} style={{ flex: '1 1 100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textMuted }}>RETURN RATE (%)</label>
                  <input type="number" value={prod2.return_rate} onChange={(e) => setProd2({...prod2, return_rate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textMuted }}>RATING (1.0 - 5.0)</label>
                  <input type="number" step="0.1" value={prod2.rating} onChange={(e) => setProd2({...prod2, rating: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textMuted }}>DISPLAY IMAGE</label>
                  <select value={prod2.img} onChange={(e) => setProd2({...prod2, img: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px', color: colors.purple, boxSizing: 'border-box' }}>
                    <option value="/illustrations/content-woman.png">Content Creator Graphic</option>
                    <option value="/illustrations/shopping-sprint.png">Shopping Sprint Graphic</option>
                    <option value="/illustrations/worker-catalog.png">Logistics Box Graphic</option>
                  </select>
                </div>
              </div>
              <textarea placeholder="Paste simulated customer complaints or listing context here to test the AI evaluation..." value={prod2.desc} onChange={(e) => setProd2({...prod2, desc: e.target.value})} style={{ width: '100%', height: '60px', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" style={{ backgroundColor: colors.purple, color: colors.white, border: 'none', padding: '14px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', marginTop: '8px' }}>
               Sync & Populate Neon DB Compute Tiers
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .feature-card-rise-node { transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.3s ease, box-shadow 0.3s ease; }
        .feature-card-rise-node:hover { transform: translateY(-8px) !important; border-color: #9F206C !important; box-shadow: 0 12px 24px rgba(159, 32, 108, 0.1) !important; }
      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, desc, btnText, onClick, themeColors }) {
  return (
    <div className="feature-card-rise-node" style={{ flex: '1 1 30%', minWidth: '280px', border: `2px solid ${themeColors.purple}`, backgroundColor: themeColors.white, padding: '28px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '34px', margin: 0, fontFamily: 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' }}>{icon}</span>
        <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: themeColors.purple, fontFamily: 'Poppins, sans-serif' }}>{title}</h4>
        <p style={{ margin: 0, fontSize: '13px', color: themeColors.textMuted, lineHeight: '1.5' }}>{desc}</p>
      </div>
      <button onClick={onClick} style={{ width: '100%', backgroundColor: themeColors.purple, color: themeColors.white, border: 'none', padding: '11px', fontSize: '13px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>{btnText}</button>
    </div>
  );
}
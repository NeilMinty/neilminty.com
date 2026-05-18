import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { NavBar } from '@/components/NavBar';
import { Home } from '@/pages/Home';
import { About } from '@/pages/About';
import { Notes } from '@/pages/Notes';
import { NoteDetail } from '@/pages/NoteDetail';
import { FirstPurchase } from '@/pages/tools/FirstPurchase';
import { Promotions } from '@/pages/tools/Promotions';
import { MarginLeakage } from '@/pages/tools/MarginLeakage';
import { ReturnsCost } from '@/pages/tools/ReturnsCost';
import { PaybackPeriod } from '@/pages/tools/PaybackPeriod';
import { SupportCostLeakage } from '@/pages/tools/SupportCostLeakage';
import { TaxonomyBuilder } from '@/pages/tools/TaxonomyBuilder';
import { GrowthRoomPrivacy } from '@/pages/GrowthRoomPrivacy';
import { GrowthRoomTerms } from '@/pages/GrowthRoomTerms';

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main className="pt-14">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:slug" element={<NoteDetail />} />
          <Route path="/tools/first-purchase" element={<FirstPurchase />} />
          <Route path="/tools/promotions" element={<Promotions />} />
          <Route path="/tools/margin-leakage" element={<MarginLeakage />} />
          <Route path="/tools/returns-cost" element={<ReturnsCost />} />
          <Route path="/tools/ltv-cac" element={<PaybackPeriod />} />
          <Route path="/tools/support-cost-leakage" element={<SupportCostLeakage />} />
          <Route path="/tools/taxonomy-builder" element={<TaxonomyBuilder />} />
          <Route path="/growth-room-privacy" element={<GrowthRoomPrivacy />} />
          <Route path="/growth-room-terms" element={<GrowthRoomTerms />} />
        </Routes>
      </main>
      <footer className="py-8 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-slate-400">© Neil Minty {new Date().getFullYear()}</p>
          <div className="flex gap-4">
            <Link to="/about" className="text-sm text-slate-400 hover:text-slate-600 no-underline hover:underline transition-colors">About</Link>
            <Link to="/growth-room-privacy" className="text-sm text-slate-400 hover:text-slate-600 no-underline hover:underline transition-colors">Growth Room Privacy Policy</Link>
            <Link to="/growth-room-terms" className="text-sm text-slate-400 hover:text-slate-600 no-underline hover:underline transition-colors">Growth Room T&Cs</Link>
          </div>
        </div>
      </footer>
      <Analytics />
    </BrowserRouter>
  );
}

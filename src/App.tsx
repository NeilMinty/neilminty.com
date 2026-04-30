import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
        </Routes>
      </main>
      <Analytics />
    </BrowserRouter>
  );
}

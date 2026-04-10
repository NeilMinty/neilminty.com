import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavBar } from '@/components/NavBar';
import { Home } from '@/pages/Home';
import { About } from '@/pages/About';
import { FirstPurchase } from '@/pages/tools/FirstPurchase';
import { Promotions } from '@/pages/tools/Promotions';
import { MarginLeakage } from '@/pages/tools/MarginLeakage';
import { ReturnsCost } from '@/pages/tools/ReturnsCost';
import { PaybackPeriod } from '@/pages/tools/PaybackPeriod';

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main className="pt-14">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/tools/first-purchase" element={<FirstPurchase />} />
          <Route path="/tools/promotions" element={<Promotions />} />
          <Route path="/tools/margin-leakage" element={<MarginLeakage />} />
          <Route path="/tools/returns-cost" element={<ReturnsCost />} />
          <Route path="/tools/payback-period" element={<PaybackPeriod />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

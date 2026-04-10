import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const tools = [
  { name: 'First Purchase', path: '/tools/first-purchase' },
  { name: 'Promotions', path: '/tools/promotions' },
  { name: 'Margin Leakage', path: '/tools/margin-leakage' },
  { name: 'Returns Cost', path: '/tools/returns-cost' },
  { name: 'Payback Period', path: '/tools/payback-period' },
];

export function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 h-14">
      <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
        <Link
          to="/"
          className="font-semibold text-slate-900 tracking-tight text-sm"
        >
          Neil Minty
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {tools.map((tool) => (
            <NavLink
              key={tool.path}
              to={tool.path}
              className={({ isActive }) =>
                `text-sm transition-colors ${
                  isActive
                    ? 'text-slate-900 font-medium'
                    : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              {tool.name}
            </NavLink>
          ))}
        </nav>

        <button
          className="md:hidden text-slate-500 hover:text-slate-800 transition-colors"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 pb-4">
          <nav className="flex flex-col gap-3 pt-3">
            {tools.map((tool) => (
              <NavLink
                key={tool.path}
                to={tool.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `text-sm ${
                    isActive ? 'text-slate-900 font-medium' : 'text-slate-500'
                  }`
                }
              >
                {tool.name}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

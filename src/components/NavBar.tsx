import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { TOOLS } from '@/lib/tools';

export function NavBar() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  useEffect(() => {
    if (!toolsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-tools-dropdown]')) setToolsOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [toolsOpen]);

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
          <div className="relative" data-tools-dropdown>
            <button
              onClick={() => setToolsOpen((o) => !o)}
              className={`text-sm transition-colors flex items-center gap-1 ${
                toolsOpen ? 'text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tools
              <ChevronDown size={13} className={`transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
            </button>
            {toolsOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                {TOOLS.map((tool) => (
                  <NavLink
                    key={tool.path}
                    to={tool.path}
                    onClick={() => setToolsOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2 text-sm transition-colors ${
                        isActive ? 'text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`
                    }
                  >
                    {tool.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `text-sm transition-colors ${isActive ? 'text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-800'}`
            }
          >
            Notes
          </NavLink>
          <a
            href="https://demo.neilminty.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            Growth Engine
          </a>
          <span className="mx-4 h-4 w-px bg-slate-200 inline-block" />
          <Link
            to="/about"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            About
          </Link>
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
            <div>
              <button
                onClick={() => setMobileToolsOpen((o) => !o)}
                className="text-sm text-slate-500 flex items-center gap-1"
              >
                Tools
                <ChevronDown size={13} className={`transition-transform ${mobileToolsOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileToolsOpen && (
                <div className="mt-2 ml-3 flex flex-col gap-2">
                  {TOOLS.map((tool) => (
                    <NavLink
                      key={tool.path}
                      to={tool.path}
                      onClick={() => { setOpen(false); setMobileToolsOpen(false); }}
                      className={({ isActive }) =>
                        `text-sm ${isActive ? 'text-slate-900 font-medium' : 'text-slate-500'}`
                      }
                    >
                      {tool.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
            <NavLink
              to="/notes"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-slate-900 font-medium' : 'text-slate-500'}`
              }
            >
              Notes
            </NavLink>
            <a
              href="https://demo.neilminty.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-500"
            >
              Growth Engine
            </a>
            <Link
              to="/about"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-500"
            >
              About
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Warehouse } from "lucide-react";
import { useEffect, useRef } from "react";

const tabs = [
  { href: "/", label: "Inventory", icon: Warehouse },
  { href: "/reports", label: "Daily Reports", icon: ClipboardList },
];

export default function NavHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publishHeight = () => {
      document.documentElement.style.setProperty("--nav-height", `${el.offsetHeight}px`);
    };
    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
        <h1 className="text-xl font-extrabold text-gray-900">Hotel Store</h1>
        <p className="text-xs text-gray-400">Inventory &amp; stock management</p>
      </div>
      <nav className="max-w-5xl mx-auto px-4 flex gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin/orders", label: "注文", icon: "\u{1F4CB}" },
  { href: "/admin/menu", label: "メニュー", icon: "\u{1F37D}\uFE0F" },
  { href: "/admin/tables", label: "席", icon: "\u{1FA91}" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      <div className="border-b px-4 py-4">
        <Link href="/admin/orders" className="text-lg font-bold">
          <span className="mr-1">{"\u2615"}</span>
          QR Order
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-2 py-3">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          ログアウト
        </Button>
      </div>
    </aside>
  );
}

import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLanguage, LANGUAGES } from "@/lib/i18n";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MonitorDot, Menu, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const [_, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const { setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      authLogout();
      setLocation("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const NavLinks = () => (
    <>
      <Link href="/services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t("nav_services")}</Link>
      <Link href="/reviews" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t("nav_reviews")}</Link>
      <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t("nav_about")}</Link>
      {user && (
        user.role === "customer" ? (
          <>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t("nav_dashboard")}</Link>
            <Link href="/book" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t("nav_book")}</Link>
            <Link href="/ai-assistant" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t("nav_ai")}</Link>
          </>
        ) : (
          <>
            <Link href="/technician/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t("nav_dashboard")}</Link>
            <Link href="/technician/bookings" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">{t("nav_jobs")}</Link>
          </>
        )
      )}
    </>
  );

  const currentLang = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary text-primary-foreground p-1 rounded group-hover:scale-110 transition-transform">
                <MonitorDot className="w-5 h-5" />
              </div>
              <span className="font-mono font-bold text-xl tracking-tight uppercase">QUANTEX</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 ml-6">
              <NavLinks />
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-1.5 font-mono text-xs px-2">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline text-muted-foreground">{currentLang?.native}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`font-mono text-xs flex justify-between cursor-pointer ${lang === l.code ? "text-primary bg-primary/10" : ""}`}
                  >
                    <span>{l.native}</span>
                    <span className="text-muted-foreground/60 text-[10px] uppercase">{l.code}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground font-mono">{user.email}</span>
                  <Button variant="outline" size="sm" onClick={handleLogout} className="font-mono text-xs">{t("nav_logout")}</Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm font-mono font-medium hover:text-primary transition-colors">{t("nav_login")}</Link>
                  <Link href="/register" className="text-sm font-mono font-medium hover:text-primary transition-colors">{t("nav_register")}</Link>
                </div>
              )}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col gap-6 pt-12">
                <NavLinks />
                <div className="h-px bg-border my-2" />
                <div className="flex flex-col gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`text-left text-sm font-mono px-2 py-1 rounded transition-colors ${lang === l.code ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"}`}
                    >
                      {l.native} <span className="text-xs opacity-50 ml-1">{l.code}</span>
                    </button>
                  ))}
                </div>
                <div className="h-px bg-border my-1" />
                {user ? (
                  <Button variant="outline" onClick={handleLogout} className="justify-start font-mono">{t("nav_logout")}</Button>
                ) : (
                  <div className="flex flex-col gap-4">
                    <Link href="/login" className="text-sm font-mono font-medium hover:text-primary transition-colors">{t("nav_login")}</Link>
                    <Link href="/register" className="text-sm font-mono font-medium hover:text-primary transition-colors">{t("nav_register")}</Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MonitorDot className="w-4 h-4 text-primary" />
            <span className="font-mono font-bold text-sm">QUANTEX SYSTEMS</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono uppercase">
            {t("footer_tagline")} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MonitorDot, Cpu, Wrench, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const { setTheme, theme } = useTheme();

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
      <Link href="/services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Services</Link>
      <Link href="/reviews" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Reviews</Link>
      <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</Link>
      {user ? (
        <>
          {user.role === "customer" ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/book" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Book Now</Link>
              <Link href="/ai-assistant" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">AI Diagnostics</Link>
            </>
          ) : (
            <>
              <Link href="/technician/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/technician/bookings" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Jobs</Link>
            </>
          )}
        </>
      ) : null}
    </>
  );

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

          <div className="flex items-center gap-4">
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

            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground font-mono">{user.email}</span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>LOGOUT</Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">LOGIN</Link>
                  <Link href="/register" className="text-sm font-medium hover:text-primary transition-colors">REGISTER</Link>
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
                {user ? (
                  <Button variant="outline" onClick={handleLogout} className="justify-start">LOGOUT</Button>
                ) : (
                  <div className="flex flex-col gap-4">
                    <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">LOGIN</Link>
                    <Link href="/register" className="text-sm font-medium hover:text-primary transition-colors">REGISTER</Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {children}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MonitorDot className="w-4 h-4 text-primary" />
            <span className="font-mono font-bold text-sm">QUANTEX SYSTEMS</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            PRECISION TECH SUPPORT &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

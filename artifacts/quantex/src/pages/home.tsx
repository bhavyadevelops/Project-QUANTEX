import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-background/95 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b')] bg-cover bg-center" />
        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-foreground">
              TECH SUPPORT ON <span className="text-primary">DEMAND</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl font-mono">
              QUANTEX deploys elite technicians to your location in minutes. PC repair, smart home setup, network optimization. Precision service when you need it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-lg px-8 py-6 uppercase font-bold" asChild>
                <Link href="/book">
                  Book a Technician <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 uppercase font-bold" asChild>
                <Link href="/ai-assistant">
                  AI Issue Diagnostics
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border border-border bg-background rounded-lg hover:border-primary/50 transition-colors group">
              <Zap className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2 uppercase">Rapid Deployment</h3>
              <p className="text-muted-foreground">Technicians dispatched immediately. Live GPS tracking to your door.</p>
            </div>
            <div className="p-6 border border-border bg-background rounded-lg hover:border-primary/50 transition-colors group">
              <Shield className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2 uppercase">Vetted Experts</h3>
              <p className="text-muted-foreground">Every technician is background-checked, tested, and rated by the community.</p>
            </div>
            <div className="p-6 border border-border bg-background rounded-lg hover:border-primary/50 transition-colors group">
              <Clock className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2 uppercase">24/7 Availability</h3>
              <p className="text-muted-foreground">Tech issues don't sleep. Neither do we. Support available round the clock.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

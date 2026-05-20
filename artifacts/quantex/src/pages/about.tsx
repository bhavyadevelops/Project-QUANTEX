import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Cpu, Shield, Zap, Users, ArrowRight, MapPin, Clock, Star } from "lucide-react";

const TEAM = [
  { name: "Marcus Chen", role: "Lead Hardware Tech", rating: 4.9, jobs: 312 },
  { name: "Priya Sharma", role: "Network Specialist", rating: 4.8, jobs: 224 },
  { name: "Derek Walsh", role: "Mobile & Software", rating: 4.7, jobs: 156 },
  { name: "Aisha Torres", role: "Smart Home Expert", rating: 4.6, jobs: 98 },
];

const VALUES = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Speed",
    desc: "Average dispatch time under 30 minutes. We don't make you wait.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Trust",
    desc: "All technicians background-checked, insured, and rated by real customers.",
  },
  {
    icon: <Cpu className="w-6 h-6" />,
    title: "Precision",
    desc: "AI-assisted diagnostics ensure accurate issue identification before dispatch.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Community",
    desc: "Transparent reviews and ratings build a trustworthy tech-support ecosystem.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 border-b border-border bg-card relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531297484001-80022131f5a1')] bg-cover bg-center opacity-5" />
        <div className="container mx-auto px-4 relative z-10">
          <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Our Mission</p>
          <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter mb-6 max-w-3xl">
            Tech Support <span className="text-primary">Reimagined</span>
          </h1>
          <p className="text-muted-foreground font-mono max-w-2xl text-lg leading-relaxed">
            QUANTEX was built on one principle: technology failures should be fixed fast. No waiting on hold. 
            No guessing. Just vetted experts at your door, powered by AI diagnostics.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { v: "500+", l: "Experts Deployed" },
              { v: "50K+", l: "Issues Resolved" },
              { v: "4.8★", l: "Avg. Rating" },
              { v: "<30m", l: "Avg. Response" },
            ].map((s) => (
              <div key={s.l} className="border border-border bg-card p-6 rounded-lg text-center hover:border-primary/40 transition-colors">
                <p className="text-3xl font-bold text-primary font-mono">{s.v}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono mt-2">{s.l}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold uppercase mb-8">Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {VALUES.map((v) => (
              <div key={v.title} className="border border-border bg-card p-6 rounded-lg hover:border-primary/40 transition-colors group">
                <div className="text-primary mb-3 group-hover:scale-110 transition-transform inline-block">{v.icon}</div>
                <h3 className="font-bold uppercase text-lg mb-2">{v.title}</h3>
                <p className="text-muted-foreground text-sm font-mono">{v.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold uppercase mb-8">Meet the Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {TEAM.map((t) => (
              <div key={t.name} className="border border-border bg-card p-6 rounded-lg text-center hover:border-primary/40 transition-colors">
                <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary font-mono">{t.name.charAt(0)}</span>
                </div>
                <p className="font-bold uppercase text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">{t.role}</p>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="text-xs font-mono text-primary flex items-center gap-1">
                    <Star className="w-3 h-3 fill-primary" /> {t.rating}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{t.jobs} jobs</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-primary/30 bg-primary/5 p-10 rounded-lg text-center">
            <h2 className="text-2xl font-bold uppercase mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground font-mono mb-6">
              Book a technician now or let our AI diagnose your issue first.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="uppercase font-bold px-8">
                <Link href="/book">Book Now <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="uppercase font-bold px-8">
                <Link href="/ai-assistant">AI Diagnostics</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

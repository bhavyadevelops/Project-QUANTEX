import React from "react";
import { Link } from "wouter";
import { useListServiceCategories, useListTechnicians } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Cpu, Wifi, Smartphone, Monitor, Home, Package, Wrench, ArrowRight, Loader2 } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  "Computer Repair": <Cpu className="w-8 h-8" />,
  "PC/Laptop Repair": <Cpu className="w-8 h-8" />,
  "Network & WiFi": <Wifi className="w-8 h-8" />,
  "WiFi/Network": <Wifi className="w-8 h-8" />,
  "Mobile Devices": <Smartphone className="w-8 h-8" />,
  "Device Setup": <Smartphone className="w-8 h-8" />,
  "Software Support": <Monitor className="w-8 h-8" />,
  "Smart Home": <Home className="w-8 h-8" />,
  "TV & Entertainment": <Monitor className="w-8 h-8" />,
  "Appliance Install": <Package className="w-8 h-8" />,
};

export default function Services() {
  const { data: categories, isLoading } = useListServiceCategories();
  const { data: technicians } = useListTechnicians();

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 border-b border-border bg-card">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Service Catalog</p>
          <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter mb-4">
            What We <span className="text-primary">Fix</span>
          </h1>
          <p className="text-muted-foreground font-mono max-w-2xl mx-auto">
            Expert technicians ready to resolve any tech issue at your location. Fast, reliable, guaranteed.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories?.map((cat) => (
                <div
                  key={cat.id}
                  className="group border border-border bg-card p-8 rounded-lg hover:border-primary/60 transition-all hover:shadow-lg hover:shadow-primary/5 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-primary/3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="text-primary mb-5 group-hover:scale-110 transition-transform inline-block">
                      {ICONS[cat.name] ?? <Wrench className="w-8 h-8" />}
                    </div>
                    <h3 className="text-xl font-bold uppercase mb-2">{cat.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4 font-mono">{cat.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-primary border border-primary/30 px-2 py-1 rounded">ON-DEMAND</span>
                      <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
                        <Link href="/book">Book Now <ArrowRight className="w-3 h-3 ml-1" /></Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold uppercase mb-8 text-center">Available Technicians</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {technicians?.slice(0, 4).map((tech) => (
              <div key={tech.id} className="border border-border bg-background p-5 rounded-lg text-center hover:border-primary/40 transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold font-mono text-lg">{tech.name?.charAt(0) ?? "T"}</span>
                </div>
                <p className="font-bold text-sm uppercase">{tech.name ?? "Technician"}</p>
                <p className="text-primary font-mono text-xs mt-1">★ {tech.rating?.toFixed(1)} · {tech.reviewCount} reviews</p>
                <p className="text-xs text-muted-foreground mt-2 font-mono">{tech.skills?.slice(0, 2).join(" · ")}</p>
                <div className={`mt-3 text-xs font-mono px-2 py-1 rounded inline-block ${tech.isAvailable ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {tech.isAvailable ? "● AVAILABLE" : "○ BUSY"}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button asChild size="lg" className="uppercase font-bold px-8">
              <Link href="/book">Book a Technician</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

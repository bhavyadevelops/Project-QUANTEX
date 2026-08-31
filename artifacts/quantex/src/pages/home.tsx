import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Clock, Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Home() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-background/95 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b')] bg-cover bg-center" />
        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-foreground">
              {t("home_hero_line1")} <span className="text-primary">{t("home_hero_line2")}</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl font-mono">
              {t("home_hero_sub")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-lg px-8 py-6 uppercase font-bold" asChild>
                <Link href="/book">
                  {t("home_book_btn")} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 uppercase font-bold" asChild>
                <Link href="/marketplace">
                  <Users className="mr-2 w-5 h-5" /> {t("nav_marketplace")}
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-lg px-8 py-6 uppercase font-bold text-muted-foreground" asChild>
                <Link href="/ai-assistant">{t("home_ai_btn")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Zap className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />, title: t("home_f1_title"), desc: t("home_f1_desc") },
              { icon: <Shield className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />, title: t("home_f2_title"), desc: t("home_f2_desc") },
              { icon: <Clock className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />, title: t("home_f3_title"), desc: t("home_f3_desc") },
            ].map((f) => (
              <div key={f.title} className="p-6 border border-border bg-background rounded-lg hover:border-primary/50 transition-colors group">
                {f.icon}
                <h3 className="text-xl font-bold mb-2 uppercase">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListTechnicians, useListServiceCategories, ListTechniciansSortBy } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { TechnicianCard } from "@/components/technician-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X, Users, Zap, MapPin, Loader2 } from "lucide-react";

type SortBy = ListTechniciansSortBy;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: ListTechniciansSortBy.nearest,         label: "Nearest First" },
  { value: ListTechniciansSortBy.highest_rated,   label: "Highest Rated" },
  { value: ListTechniciansSortBy.lowest_price,    label: "Lowest Price" },
  { value: ListTechniciansSortBy.most_experienced, label: "Most Experienced" },
  { value: ListTechniciansSortBy.fastest,         label: "Fastest" },
];

interface Filters {
  isAvailable: boolean;
  verified: boolean;
  emergencyAvailable: boolean;
  minRating: number | undefined;
  maxRate: number | undefined;
  minExperience: number | undefined;
  radius: number | undefined;
  categoryId: number | undefined;
}

const INITIAL_FILTERS: Filters = {
  isAvailable: false,
  verified: false,
  emergencyAvailable: false,
  minRating: undefined,
  maxRate: undefined,
  minExperience: undefined,
  radius: undefined,
  categoryId: undefined,
};

function TechnicianSkeleton() {
  return (
    <div className="border border-border/50 rounded-lg p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-10 rounded" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-5 w-20 rounded" />
      </div>
      <div className="flex gap-2 pt-3 border-t border-border/40">
        <Skeleton className="h-8 flex-1 rounded" />
        <Skeleton className="h-8 flex-1 rounded" />
      </div>
    </div>
  );
}

function FilterPanel({
  filters,
  onFiltersChange,
  categories,
  hasLocation,
}: {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  categories: { id: number; name: string }[];
  hasLocation: boolean;
}) {
  const { t } = useLanguage();

  const toggle = (key: keyof Pick<Filters, "isAvailable" | "verified" | "emergencyAvailable">) => {
    onFiltersChange({ ...filters, [key]: !filters[key] });
  };

  const hasActiveFilters = filters.isAvailable || filters.verified || filters.emergencyAvailable ||
    filters.minRating !== undefined || filters.maxRate !== undefined ||
    filters.minExperience !== undefined || filters.radius !== undefined || filters.categoryId !== undefined;

  return (
    <div className="space-y-5">
      {hasActiveFilters && (
        <button
          onClick={() => onFiltersChange(INITIAL_FILTERS)}
          className="text-xs font-mono text-primary hover:underline uppercase flex items-center gap-1"
        >
          <X className="w-3 h-3" /> {t("mkt_clear")}
        </button>
      )}

      {/* Toggles */}
      <div className="space-y-3">
        {[
          { key: "isAvailable" as const, label: t("mkt_available_only") },
          { key: "verified" as const, label: t("mkt_verified_only") },
          { key: "emergencyAvailable" as const, label: "Emergency Service" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-mono uppercase transition-colors ${
              filters[key]
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30"
            }`}
          >
            <span>{label}</span>
            <span className={`w-2 h-2 rounded-full ${filters[key] ? "bg-primary" : "bg-muted-foreground/30"}`} />
          </button>
        ))}
      </div>

      {/* Min rating */}
      <div className="space-y-2">
        <p className="text-xs font-mono uppercase text-muted-foreground">{t("mkt_min_rating")}</p>
        <div className="flex gap-2">
          {[0, 3, 4, 4.5].map(r => (
            <button
              key={r}
              onClick={() => onFiltersChange({ ...filters, minRating: filters.minRating === r ? undefined : r })}
              className={`flex-1 text-xs font-mono py-1.5 rounded border transition-colors ${
                filters.minRating === r
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {r === 0 ? "Any" : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Max rate */}
      <div className="space-y-2">
        <p className="text-xs font-mono uppercase text-muted-foreground">{t("mkt_max_rate")} ($/hr)</p>
        <div className="flex gap-2">
          {[50, 75, 100, 150].map(r => (
            <button
              key={r}
              onClick={() => onFiltersChange({ ...filters, maxRate: filters.maxRate === r ? undefined : r })}
              className={`flex-1 text-xs font-mono py-1.5 rounded border transition-colors ${
                filters.maxRate === r
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              ${r}
            </button>
          ))}
        </div>
      </div>

      {/* Min experience */}
      <div className="space-y-2">
        <p className="text-xs font-mono uppercase text-muted-foreground">Min Experience</p>
        <div className="flex gap-2">
          {[0, 2, 5, 10].map(y => (
            <button
              key={y}
              onClick={() => onFiltersChange({ ...filters, minExperience: filters.minExperience === y ? undefined : y })}
              className={`flex-1 text-xs font-mono py-1.5 rounded border transition-colors ${
                filters.minExperience === y
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {y === 0 ? "Any" : `${y}+ yr`}
            </button>
          ))}
        </div>
      </div>

      {/* Distance radius — shown only when location is available */}
      {hasLocation && (
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" /> Distance Radius
          </p>
          <div className="flex gap-2">
            {[5, 10, 25, 50].map(km => (
              <button
                key={km}
                onClick={() => onFiltersChange({ ...filters, radius: filters.radius === km ? undefined : km })}
                className={`flex-1 text-xs font-mono py-1.5 rounded border transition-colors ${
                  filters.radius === km
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {km}km
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase text-muted-foreground">Service Category</p>
          <div className="space-y-1.5">
            <button
              onClick={() => onFiltersChange({ ...filters, categoryId: undefined })}
              className={`w-full text-left text-xs font-mono px-3 py-2 rounded border transition-colors ${
                filters.categoryId === undefined
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              All Categories
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => onFiltersChange({ ...filters, categoryId: filters.categoryId === c.id ? undefined : c.id })}
                className={`w-full text-left text-xs font-mono px-3 py-2 rounded border transition-colors ${
                  filters.categoryId === c.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied" };

export default function Marketplace() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>(ListTechniciansSortBy.highest_rated);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  // Fixed debounce: useEffect with cleanup cancels stale timers
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) return;
    setLocation({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ status: "granted", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ status: "denied" }),
      { timeout: 8000 },
    );
  };

  const hasLocation = location.status === "granted";
  const locCoords = hasLocation ? { lat: (location as any).lat as number, lng: (location as any).lng as number } : {};

  const { data: categories = [] } = useListServiceCategories();

  const queryParams = {
    search: debouncedSearch || undefined,
    sortBy,
    isAvailable: filters.isAvailable || undefined,
    verified: filters.verified || undefined,
    emergencyAvailable: filters.emergencyAvailable || undefined,
    minRating: filters.minRating,
    maxRate: filters.maxRate,
    minExperience: filters.minExperience,
    radius: hasLocation ? filters.radius : undefined,
    categoryId: filters.categoryId,
    limit: 50,
    ...locCoords,
  };

  const { data: technicians = [], isLoading } = useListTechnicians(queryParams);

  const activeFilterCount = [
    filters.isAvailable, filters.verified, filters.emergencyAvailable,
    filters.minRating !== undefined, filters.maxRate !== undefined,
    filters.minExperience !== undefined,
    hasLocation && filters.radius !== undefined,
    filters.categoryId !== undefined,
  ].filter(Boolean).length;

  const isCustomer = user?.role === "customer";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <p className="text-primary font-mono text-sm uppercase tracking-widest mb-1">{t("mkt_label")}</p>
          <h1 className="text-3xl font-bold uppercase mb-1">{t("mkt_title")}</h1>
          <p className="text-muted-foreground font-mono text-sm">{t("mkt_subtitle")}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search + Sort bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("mkt_search_ph")}
              className="pl-9 font-mono text-sm bg-card border-border focus:border-primary"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setDebouncedSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile filter sheet trigger + location + sort */}
          <div className="flex gap-2">
            {/* Use My Location button */}
            {location.status === "idle" && (
              <Button
                variant="outline" size="sm"
                className="font-mono uppercase text-xs shrink-0"
                onClick={requestLocation}
              >
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> Use Location
              </Button>
            )}
            {location.status === "requesting" && (
              <Button variant="outline" size="sm" className="font-mono uppercase text-xs shrink-0" disabled>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Locating…
              </Button>
            )}
            {location.status === "granted" && (
              <Button
                variant="outline" size="sm"
                className="font-mono uppercase text-xs text-primary border-primary/40 shrink-0"
                onClick={() => { setLocation({ status: "idle" }); setFilters(f => ({ ...f, radius: undefined })); }}
              >
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> Location On
              </Button>
            )}
            {location.status === "denied" && (
              <Button variant="outline" size="sm" className="font-mono uppercase text-xs text-muted-foreground shrink-0 cursor-default" disabled>
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> Location Off
              </Button>
            )}

            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono uppercase text-xs relative">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" /> {t("mkt_filters")}
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-[10px] text-black font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-background border-border overflow-y-auto">
                <SheetHeader className="pb-4 border-b border-border">
                  <SheetTitle className="font-mono uppercase text-sm">{t("mkt_filter_title")}</SheetTitle>
                </SheetHeader>
                <div className="pt-5">
                  <FilterPanel
                    filters={filters}
                    onFiltersChange={f => { setFilters(f); }}
                    categories={categories}
                    hasLocation={hasLocation}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="border border-border rounded-md px-3 py-1.5 text-xs font-mono bg-card text-foreground focus:outline-none focus:border-primary"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop filter sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="border border-border bg-card rounded-lg p-4 sticky top-4">
              <h2 className="font-mono uppercase text-xs text-muted-foreground mb-4">{t("mkt_filter_title")}</h2>
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                categories={categories}
                hasLocation={hasLocation}
              />
            </div>
          </aside>

          {/* Main grid */}
          <div className="flex-1 min-w-0">
            {/* Result count */}
            {!isLoading && (
              <p className="text-xs font-mono text-muted-foreground mb-4 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span><span className="text-foreground font-bold">{technicians.length}</span> {t("mkt_results")}</span>
              </p>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <TechnicianSkeleton key={i} />)}
              </div>
            ) : technicians.length === 0 ? (
              <div className="border border-border/50 bg-card rounded-lg p-16 text-center">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-bold uppercase text-sm mb-2">{t("mkt_empty_title")}</h3>
                <p className="text-muted-foreground font-mono text-xs mb-4">{t("mkt_empty_desc")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono uppercase text-xs"
                  onClick={() => { setFilters(INITIAL_FILTERS); setSearch(""); setDebouncedSearch(""); }}
                >
                  <X className="w-3 h-3 mr-1" /> {t("mkt_clear")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {technicians.map(tech => (
                  <TechnicianCard key={tech.id} technician={tech as any} />
                ))}
              </div>
            )}

            {/* CTA for non-logged-in users */}
            {!isCustomer && !user && (
              <div className="mt-8 border border-primary/30 bg-primary/5 rounded-lg p-6 text-center">
                <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="font-bold uppercase text-sm mb-1">Ready to book?</h3>
                <p className="text-muted-foreground font-mono text-xs mb-4">Create an account to book any technician instantly.</p>
                <Button asChild size="sm" className="font-mono uppercase text-xs">
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useGetMyTechnicianProfile,
  useCreateTechnicianProfile,
  useUpdateTechnician,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  User,
  Briefcase,
  DollarSign,
  Clock,
  MapPin,
  Eye,
  Star,
  Zap,
  Shield,
} from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LANGUAGES = ["English", "Hindi", "Gujarati", "French", "German", "Spanish", "Mandarin", "Arabic"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const STEP_LABELS = [
  { icon: <User className="w-4 h-4" />, label: "PERSONAL" },
  { icon: <Briefcase className="w-4 h-4" />, label: "EXPERTISE" },
  { icon: <DollarSign className="w-4 h-4" />, label: "PRICING" },
  { icon: <Clock className="w-4 h-4" />, label: "SCHEDULE" },
  { icon: <MapPin className="w-4 h-4" />, label: "COVERAGE" },
  { icon: <Eye className="w-4 h-4" />, label: "PREVIEW" },
];

type WizardData = {
  gender: string;
  dateOfBirth: string;
  languagesSpoken: string[];
  bio: string;
  profession: string[];
  yearsExperience: string;
  certifications: string;
  previousCompany: string;
  areasOfExpertise: string;
  skills: string;
  hourlyRate: string;
  visitCharge: string;
  perJobRate: string;
  inspectionCharge: string;
  emergencyCharge: string;
  weekendCharge: string;
  nightCharge: string;
  workingDays: string[];
  workingHoursStart: string;
  workingHoursEnd: string;
  emergencyAvailable: boolean;
  maxDailyBookings: string;
  serviceCity: string;
  pinCode: string;
  serviceRadius: string;
};

const DEFAULT: WizardData = {
  gender: "",
  dateOfBirth: "",
  languagesSpoken: ["English"],
  bio: "",
  profession: [],
  yearsExperience: "",
  certifications: "",
  previousCompany: "",
  areasOfExpertise: "",
  skills: "",
  hourlyRate: "",
  visitCharge: "",
  perJobRate: "",
  inspectionCharge: "",
  emergencyCharge: "",
  weekendCharge: "",
  nightCharge: "",
  workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  emergencyAvailable: false,
  maxDailyBookings: "5",
  serviceCity: "",
  pinCode: "",
  serviceRadius: "20",
};

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-mono uppercase transition-colors border ${
        active
          ? "border-primary bg-primary/20 text-primary"
          : "border-border bg-background/50 text-muted-foreground hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono uppercase text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-mono uppercase text-primary tracking-widest border-b border-primary/20 pb-2 mb-4">
      {children}
    </h3>
  );
}

export default function TechnicianOnboarding() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(DEFAULT);
  const [technicianId, setTechnicianId] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(true);

  const { data: existingProfile } = useGetMyTechnicianProfile({ query: { retry: false } as any });
  const createProfile = useCreateTechnicianProfile();
  const updateProfile = useUpdateTechnician();

  useEffect(() => {
    if (existingProfile) {
      setTechnicianId(existingProfile.id);
      setData(prev => ({
        ...prev,
        gender: existingProfile.gender ?? "",
        dateOfBirth: existingProfile.dateOfBirth ?? "",
        languagesSpoken: existingProfile.languagesSpoken?.length ? existingProfile.languagesSpoken : ["English"],
        bio: existingProfile.bio ?? "",
        profession: existingProfile.profession ?? [],
        yearsExperience: existingProfile.yearsExperience?.toString() ?? "",
        certifications: existingProfile.certifications?.join(", ") ?? "",
        previousCompany: existingProfile.previousCompany ?? "",
        areasOfExpertise: existingProfile.areasOfExpertise?.join(", ") ?? "",
        skills: existingProfile.skills?.join(", ") ?? "",
        hourlyRate: existingProfile.hourlyRate?.toString() ?? "",
        visitCharge: existingProfile.visitCharge?.toString() ?? "",
        perJobRate: existingProfile.perJobRate?.toString() ?? "",
        inspectionCharge: existingProfile.inspectionCharge?.toString() ?? "",
        emergencyCharge: existingProfile.emergencyCharge?.toString() ?? "",
        weekendCharge: existingProfile.weekendCharge?.toString() ?? "",
        nightCharge: existingProfile.nightCharge?.toString() ?? "",
        workingDays: existingProfile.workingDays?.length ? existingProfile.workingDays : ["Mon", "Tue", "Wed", "Thu", "Fri"],
        workingHoursStart: existingProfile.workingHoursStart ?? "09:00",
        workingHoursEnd: existingProfile.workingHoursEnd ?? "18:00",
        emergencyAvailable: existingProfile.emergencyAvailable ?? false,
        maxDailyBookings: existingProfile.maxDailyBookings?.toString() ?? "5",
        serviceCity: existingProfile.serviceCity ?? "",
        pinCode: existingProfile.pinCode ?? "",
        serviceRadius: existingProfile.serviceRadius?.toString() ?? "20",
      }));
      setInitializing(false);
    }
  }, [existingProfile]);

  useEffect(() => {
    if (!existingProfile && !createProfile.isPending && initializing) {
      const timer = setTimeout(async () => {
        try {
          const profile = await createProfile.mutateAsync({
            data: { skills: [], hourlyRate: 0, responseTime: "30 min" },
          });
          setTechnicianId(profile.id);
        } catch {
        }
        setInitializing(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [existingProfile, initializing]);

  const set = (key: keyof WizardData, value: WizardData[typeof key]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const toggleList = (key: "languagesSpoken" | "workingDays" | "profession", val: string) => {
    setData(prev => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val],
      };
    });
  };

  const parseNum = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? undefined : n;
  };

  const parseIntNum = (v: string) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? undefined : n;
  };

  const parseList = (v: string) =>
    v.split(",").map(s => s.trim()).filter(Boolean);

  const handleFinish = async () => {
    if (!technicianId) return;
    try {
      await updateProfile.mutateAsync({
        id: technicianId,
        data: {
          bio: data.bio || undefined,
          skills: parseList(data.skills),
          hourlyRate: parseNum(data.hourlyRate) ?? 0,
          responseTime: "30 min",
          profession: data.profession,
          yearsExperience: parseIntNum(data.yearsExperience),
          certifications: parseList(data.certifications),
          previousCompany: data.previousCompany || undefined,
          areasOfExpertise: parseList(data.areasOfExpertise),
          languagesSpoken: data.languagesSpoken,
          visitCharge: parseNum(data.visitCharge),
          perJobRate: parseNum(data.perJobRate),
          inspectionCharge: parseNum(data.inspectionCharge),
          emergencyCharge: parseNum(data.emergencyCharge),
          weekendCharge: parseNum(data.weekendCharge),
          nightCharge: parseNum(data.nightCharge),
          workingDays: data.workingDays,
          workingHoursStart: data.workingHoursStart || undefined,
          workingHoursEnd: data.workingHoursEnd || undefined,
          emergencyAvailable: data.emergencyAvailable,
          maxDailyBookings: parseIntNum(data.maxDailyBookings),
          serviceCity: data.serviceCity || undefined,
          pinCode: data.pinCode || undefined,
          serviceRadius: parseIntNum(data.serviceRadius),
        },
      });
      toast({ title: "Profile Complete", description: "Your technician profile is live." });
      setLocation("/technician/dashboard");
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs font-mono text-muted-foreground uppercase">Initializing profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <p className="text-primary font-mono text-xs uppercase tracking-widest">TECHNICIAN PORTAL</p>
          <h1 className="text-3xl font-bold uppercase mt-1">PROFILE SETUP</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Complete your profile to start receiving jobs.
          </p>
        </div>

        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
          {STEP_LABELS.map((s, i) => (
            <React.Fragment key={i}>
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`flex flex-col items-center gap-1 min-w-[48px] transition-opacity ${
                  i <= step ? "opacity-100" : "opacity-40"
                } ${i < step ? "cursor-pointer" : "cursor-default"}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                    i < step
                      ? "border-primary bg-primary text-black"
                      : i === step
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {i < step ? <CheckCircle className="w-4 h-4" /> : s.icon}
                </div>
                <span className={`text-[10px] font-mono ${i === step ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </button>
              {i < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="border border-border bg-card rounded-lg p-6 relative overflow-hidden min-h-[400px]">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

          {step === 0 && (
            <div className="space-y-5">
              <SectionHeading>Personal Information</SectionHeading>
              <FieldRow label="Gender">
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map(g => (
                    <ToggleChip key={g} label={g} active={data.gender === g} onClick={() => set("gender", g)} />
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Date of Birth">
                <Input
                  type="date"
                  value={data.dateOfBirth}
                  onChange={e => set("dateOfBirth", e.target.value)}
                  className="bg-background/50 font-mono max-w-xs"
                />
              </FieldRow>
              <FieldRow label="Languages Spoken">
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <ToggleChip
                      key={l}
                      label={l}
                      active={data.languagesSpoken.includes(l)}
                      onClick={() => toggleList("languagesSpoken", l)}
                    />
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Professional Bio">
                <Textarea
                  placeholder="Describe your experience, specialties, and what sets you apart..."
                  value={data.bio}
                  onChange={e => set("bio", e.target.value)}
                  rows={4}
                  className="bg-background/50 font-mono resize-none"
                />
              </FieldRow>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <SectionHeading>Professional Expertise</SectionHeading>
              <FieldRow label="Profession / Role (select all that apply)">
                <div className="flex flex-wrap gap-2">
                  {[
                    "Electrician", "Plumber", "HVAC Technician", "Appliance Repair",
                    "Computer Technician", "Network Engineer", "Security Specialist",
                    "Solar Technician", "General Handyman", "Carpenter",
                  ].map(p => (
                    <ToggleChip
                      key={p}
                      label={p}
                      active={data.profession.includes(p)}
                      onClick={() => toggleList("profession", p)}
                    />
                  ))}
                </div>
              </FieldRow>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="Years of Experience">
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    placeholder="e.g. 5"
                    value={data.yearsExperience}
                    onChange={e => set("yearsExperience", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
                <FieldRow label="Previous Company">
                  <Input
                    placeholder="e.g. HomeServe Inc."
                    value={data.previousCompany}
                    onChange={e => set("previousCompany", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
              </div>
              <FieldRow label="Certifications (comma-separated)">
                <Input
                  placeholder="e.g. OSHA 10, EPA 608, CompTIA A+"
                  value={data.certifications}
                  onChange={e => set("certifications", e.target.value)}
                  className="bg-background/50 font-mono"
                />
              </FieldRow>
              <FieldRow label="Areas of Expertise (comma-separated)">
                <Input
                  placeholder="e.g. Circuit breakers, Water heaters, CCTV installation"
                  value={data.areasOfExpertise}
                  onChange={e => set("areasOfExpertise", e.target.value)}
                  className="bg-background/50 font-mono"
                />
              </FieldRow>
              <FieldRow label="Skills / Tools (comma-separated)">
                <Input
                  placeholder="e.g. Multimeter, Pipe wrench, Oscilloscope"
                  value={data.skills}
                  onChange={e => set("skills", e.target.value)}
                  className="bg-background/50 font-mono"
                />
              </FieldRow>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <SectionHeading>Pricing Structure</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "hourlyRate" as const,      label: "Hourly Rate ($)",        ph: "e.g. 75" },
                  { key: "perJobRate" as const,       label: "Per-Job Flat Rate ($)",   ph: "e.g. 120" },
                  { key: "visitCharge" as const,      label: "Visit / Call-out Fee ($)", ph: "e.g. 25" },
                  { key: "inspectionCharge" as const, label: "Inspection Fee ($)",      ph: "e.g. 40" },
                  { key: "emergencyCharge" as const,  label: "Emergency Surcharge ($)", ph: "e.g. 50" },
                  { key: "weekendCharge" as const,    label: "Weekend Surcharge ($)",   ph: "e.g. 30" },
                  { key: "nightCharge" as const,      label: "Night Surcharge ($)",     ph: "e.g. 35" },
                ].map(({ key, label, ph }) => (
                  <FieldRow key={key} label={label}>
                    <Input
                      type="number"
                      min="0"
                      placeholder={ph}
                      value={data[key]}
                      onChange={e => set(key, e.target.value)}
                      className="bg-background/50 font-mono"
                    />
                  </FieldRow>
                ))}
              </div>
              <div className="border border-border/40 rounded p-3 bg-muted/10">
                <p className="text-xs font-mono text-muted-foreground">
                  All rates are in USD. Surcharges are added on top of your base rate. Customers see these before booking.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <SectionHeading>Availability & Schedule</SectionHeading>
              <FieldRow label="Working Days">
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => (
                    <ToggleChip
                      key={d}
                      label={d}
                      active={data.workingDays.includes(d)}
                      onClick={() => toggleList("workingDays", d)}
                    />
                  ))}
                </div>
              </FieldRow>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="Start Time">
                  <Input
                    type="time"
                    value={data.workingHoursStart}
                    onChange={e => set("workingHoursStart", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
                <FieldRow label="End Time">
                  <Input
                    type="time"
                    value={data.workingHoursEnd}
                    onChange={e => set("workingHoursEnd", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
              </div>
              <FieldRow label="Max Daily Bookings">
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={data.maxDailyBookings}
                  onChange={e => set("maxDailyBookings", e.target.value)}
                  className="bg-background/50 font-mono max-w-xs"
                />
              </FieldRow>
              <div>
                <button
                  type="button"
                  onClick={() => set("emergencyAvailable", !data.emergencyAvailable)}
                  className={`flex items-center gap-3 w-full border rounded-lg p-4 transition-colors ${
                    data.emergencyAvailable
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/50 hover:border-primary/40"
                  }`}
                >
                  <Zap className={`w-5 h-5 ${data.emergencyAvailable ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className={`font-mono text-sm font-bold uppercase ${data.emergencyAvailable ? "text-primary" : ""}`}>
                      Emergency / 24-7 Available
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Accept urgent calls outside working hours
                    </p>
                  </div>
                  <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    data.emergencyAvailable ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {data.emergencyAvailable && <CheckCircle className="w-3 h-3 text-black" />}
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <SectionHeading>Service Coverage Area</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="City / District">
                  <Input
                    placeholder="e.g. San Francisco"
                    value={data.serviceCity}
                    onChange={e => set("serviceCity", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
                <FieldRow label="ZIP / PIN Code">
                  <Input
                    placeholder="e.g. 94103"
                    value={data.pinCode}
                    onChange={e => set("pinCode", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
              </div>
              <FieldRow label="Service Radius (km)">
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={data.serviceRadius}
                    onChange={e => set("serviceRadius", e.target.value)}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>1 km</span>
                    <span className="text-primary font-bold">{data.serviceRadius} km</span>
                    <span>100 km</span>
                  </div>
                </div>
              </FieldRow>
              <div className="border border-border/40 rounded-lg p-4 bg-muted/10 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono uppercase text-primary">Coverage Summary</span>
                </div>
                <p className="text-sm font-mono">
                  {data.serviceCity || "Your city"} ·{" "}
                  <span className="text-primary">{data.serviceRadius} km radius</span>
                </p>
                {data.pinCode && (
                  <p className="text-xs text-muted-foreground font-mono">PIN: {data.pinCode}</p>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <SectionHeading>Profile Preview</SectionHeading>
              <div className="border border-primary/30 bg-primary/5 rounded-lg p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-primary font-mono">
                      {user?.name?.charAt(0) ?? "T"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg uppercase">{user?.name}</h2>
                    <p className="text-xs font-mono text-primary">
                      {data.profession.join(" · ") || "TECHNICIAN"}
                    </p>
                    {data.serviceCity && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        <MapPin className="w-3 h-3 inline mr-1" />{data.serviceCity} · {data.serviceRadius} km radius
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold font-mono text-primary">
                      ${data.hourlyRate || "—"}<span className="text-xs text-muted-foreground">/hr</span>
                    </p>
                    {data.emergencyAvailable && (
                      <span className="text-[10px] font-mono bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded">
                        24/7
                      </span>
                    )}
                  </div>
                </div>

                {data.bio && (
                  <p className="text-sm text-muted-foreground border-t border-border/40 pt-3">
                    {data.bio}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs font-mono border-t border-border/40 pt-3">
                  {data.yearsExperience && (
                    <div>
                      <span className="text-muted-foreground uppercase">Experience</span>
                      <p className="font-bold text-sm mt-0.5">{data.yearsExperience} yrs</p>
                    </div>
                  )}
                  {data.languagesSpoken.length > 0 && (
                    <div>
                      <span className="text-muted-foreground uppercase">Languages</span>
                      <p className="font-bold text-sm mt-0.5">{data.languagesSpoken.join(", ")}</p>
                    </div>
                  )}
                  {data.workingDays.length > 0 && (
                    <div>
                      <span className="text-muted-foreground uppercase">Working Days</span>
                      <p className="font-bold text-sm mt-0.5">{data.workingDays.join(", ")}</p>
                    </div>
                  )}
                  {data.workingHoursStart && data.workingHoursEnd && (
                    <div>
                      <span className="text-muted-foreground uppercase">Hours</span>
                      <p className="font-bold text-sm mt-0.5">{data.workingHoursStart} – {data.workingHoursEnd}</p>
                    </div>
                  )}
                  {data.maxDailyBookings && (
                    <div>
                      <span className="text-muted-foreground uppercase">Max Daily Jobs</span>
                      <p className="font-bold text-sm mt-0.5">{data.maxDailyBookings}</p>
                    </div>
                  )}
                  {data.visitCharge && (
                    <div>
                      <span className="text-muted-foreground uppercase">Visit Fee</span>
                      <p className="font-bold text-sm mt-0.5">${data.visitCharge}</p>
                    </div>
                  )}
                </div>

                {(parseList(data.skills).length > 0 || parseList(data.certifications).length > 0) && (
                  <div className="border-t border-border/40 pt-3 space-y-2">
                    {parseList(data.skills).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {parseList(data.skills).slice(0, 8).map(s => (
                          <span key={s} className="text-[10px] font-mono border border-border px-2 py-0.5 rounded text-muted-foreground">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {parseList(data.certifications).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {parseList(data.certifications).map(c => (
                          <span key={c} className="text-[10px] font-mono border border-primary/40 px-2 py-0.5 rounded text-primary bg-primary/10">
                            <Shield className="w-2.5 h-2.5 inline mr-0.5" />{c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs font-mono text-muted-foreground">New · 0 reviews</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-xs font-mono text-muted-foreground">
                    {data.emergencyAvailable ? "24/7 Emergency" : "Scheduled only"}
                  </span>
                </div>
              </div>

              <div className="border border-yellow-400/20 bg-yellow-400/5 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs font-mono text-muted-foreground">
                  Review your profile above. You can always update it later from <strong>Settings</strong>. Click <strong>LAUNCH PROFILE</strong> to go live.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-between gap-4">
          <Button
            variant="outline"
            className="uppercase font-mono"
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step < 5 ? (
            <Button className="uppercase font-bold font-mono px-8" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="uppercase font-bold font-mono px-8"
              onClick={handleFinish}
              disabled={updateProfile.isPending || !technicianId}
            >
              {updateProfile.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Launch Profile</>
              )}
            </Button>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setLocation("/technician/dashboard")}
            className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase"
          >
            Skip for now → complete later in Settings
          </button>
        </div>
      </div>
    </div>
  );
}

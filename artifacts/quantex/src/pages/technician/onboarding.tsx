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
import { TechnicianProfileCard } from "@/components/technician-profile-card";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  User,
  Briefcase,
  Wrench,
  DollarSign,
  Clock,
  Eye,
  Zap,
  PlusCircle,
  X,
} from "lucide-react";

export const PROFESSIONS = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "AC Technician",
  "Appliance Repair",
  "Computer Repair",
  "Laptop Repair",
  "Mobile Repair",
  "CCTV Installation",
  "RO Service",
  "Painter",
  "Welder",
  "Mason",
  "Interior Work",
  "Furniture Assembly",
  "Mechanic",
  "Solar Technician",
  "Internet & Networking",
  "Smart Home Installation",
  "Pest Control",
  "Cleaning Services",
  "Gardening",
  "Home Automation",
  "Custom/Other",
];

export const PROFESSION_SERVICES: Record<string, string[]> = {
  "Electrician": ["Wiring & Rewiring", "MCB/Fuse Box Repair", "Outlet Installation", "Lighting Setup", "Fan Installation", "Earthing Check", "Short Circuit Fix"],
  "Plumber": ["Pipe Repair", "Leak Detection", "Geyser Installation", "Drain Cleaning", "Tap/Faucet Fix", "Toilet Repair", "Water Tank Cleaning"],
  "Carpenter": ["Furniture Repair", "Door/Window Fix", "Cabinet Making", "Shelving", "Wardrobe Fitting", "Wooden Flooring", "Furniture Assembly"],
  "AC Technician": ["AC Installation", "AC Gas Refilling", "AC Servicing & Cleaning", "AC Repair", "Thermostat Replacement", "Compressor Service", "Duct Cleaning"],
  "Appliance Repair": ["Refrigerator Repair", "Washing Machine Repair", "Microwave Repair", "Dishwasher Repair", "Dryer Repair", "Oven/Range Repair"],
  "Computer Repair": ["Hardware Repair", "OS Installation", "Virus Removal", "Data Recovery", "RAM/SSD Upgrade", "Network Card Repair"],
  "Laptop Repair": ["Screen Replacement", "Battery Replacement", "Keyboard Repair", "Charging Port Fix", "Hinge Repair", "Motherboard Repair"],
  "Mobile Repair": ["Screen Replacement", "Battery Replacement", "Charging Port Fix", "Speaker Repair", "Back Glass Replacement", "Software Flash", "Water Damage Repair"],
  "CCTV Installation": ["CCTV Camera Install", "DVR/NVR Setup", "Remote Viewing Config", "IP Camera Config", "Access Control", "Alarm System Setup", "Intercom Install"],
  "RO Service": ["Filter Replacement", "Membrane Change", "Annual Servicing", "RO Installation", "TDS Calibration", "UV Lamp Replacement", "Pump Repair"],
  "Painter": ["Interior Painting", "Exterior Painting", "Texture Finish", "Wallpaper Install", "Waterproofing", "Wood Polish", "Epoxy Flooring"],
  "Welder": ["MIG Welding", "TIG Welding", "Arc Welding", "Gate/Grill Fabrication", "Stainless Steel Work", "Aluminium Welding", "Repair Welding"],
  "Mason": ["Brickwork", "Plastering", "Waterproofing", "Tile Fixing", "Concrete Work", "Foundation Repair", "Wall Repair"],
  "Interior Work": ["False Ceiling", "Wall Panelling", "POP Work", "Gypsum Board", "Partition Work", "Glass Partition", "Modular Furniture Fitting"],
  "Furniture Assembly": ["Wardrobe Assembly", "Bed Assembly", "Dining Table Setup", "Office Chair Assembly", "Shelf Assembly", "TV Unit Assembly"],
  "Mechanic": ["Vehicle Servicing", "Oil Change", "Brake Repair", "Tyre Change", "Battery Replacement", "Engine Tune-up", "AC Recharge"],
  "Solar Technician": ["Solar Panel Install", "Inverter Setup", "Battery Bank Setup", "System Audit", "Panel Cleaning", "Net Metering", "Monitoring Setup"],
  "Internet & Networking": ["Router Config", "WiFi Extender Setup", "LAN Cabling", "Network Troubleshooting", "VPN Setup", "Firewall Config", "Home Office Network"],
  "Smart Home Installation": ["Smart Hub Setup", "Voice Assistant Config", "Smart Lighting", "Smart Lock Install", "Home Theater Setup", "Smart Doorbell", "Automation Scenes"],
  "Pest Control": ["General Pest Treatment", "Cockroach Treatment", "Ant Treatment", "Rodent Control", "Termite Treatment", "Bed Bug Treatment", "Mosquito Fogging"],
  "Cleaning Services": ["Deep Cleaning", "Sofa & Carpet Cleaning", "Kitchen Deep Clean", "Bathroom Sanitisation", "Move-in/out Clean", "Post-construction Clean", "Water Tank Cleaning"],
  "Gardening": ["Lawn Mowing", "Hedge Trimming", "Plant Care", "Garden Design", "Soil Treatment", "Irrigation Setup", "Tree Trimming"],
  "Home Automation": ["Automation Programming", "Scene Setup", "Sensor Installation", "Smart Thermostat", "HVAC Automation", "Energy Monitoring", "Custom Automation"],
  "Custom/Other": ["On-site Diagnosis", "Consultation", "General Maintenance", "Custom Repair", "Emergency Visit"],
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LANGUAGES = ["English", "Hindi", "Gujarati", "French", "German", "Spanish", "Mandarin", "Arabic", "Portuguese", "Russian"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const STEP_LABELS = [
  { icon: <User className="w-4 h-4" />,       label: "PERSONAL" },
  { icon: <Briefcase className="w-4 h-4" />,   label: "EXPERTISE" },
  { icon: <Wrench className="w-4 h-4" />,      label: "SERVICES" },
  { icon: <DollarSign className="w-4 h-4" />,  label: "PRICING" },
  { icon: <Clock className="w-4 h-4" />,       label: "SCHEDULE" },
  { icon: <Eye className="w-4 h-4" />,         label: "PREVIEW" },
];

type ServicesOffered = Record<string, string[]>;

type WizardData = {
  gender: string;
  dateOfBirth: string;
  languagesSpoken: string[];
  bio: string;
  serviceCity: string;
  pinCode: string;
  serviceRadius: string;
  profession: string[];
  yearsExperience: string;
  certifications: string;
  previousCompany: string;
  areasOfExpertise: string;
  skills: string;
  servicesOffered: ServicesOffered;
  customServices: Record<string, string>;
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
  vacationMode: boolean;
  maxDailyBookings: string;
};

const DEFAULT: WizardData = {
  gender: "",
  dateOfBirth: "",
  languagesSpoken: ["English"],
  bio: "",
  serviceCity: "",
  pinCode: "",
  serviceRadius: "20",
  profession: [],
  yearsExperience: "",
  certifications: "",
  previousCompany: "",
  areasOfExpertise: "",
  skills: "",
  servicesOffered: {},
  customServices: {},
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
  vacationMode: false,
  maxDailyBookings: "5",
};

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 w-full border rounded-lg p-4 transition-colors ${
        checked
          ? "border-primary bg-primary/10"
          : "border-border bg-background/50 hover:border-primary/40"
      }`}
    >
      <span className={checked ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <div className="text-left flex-1">
        <p className={`font-mono text-sm font-bold uppercase ${checked ? "text-primary" : ""}`}>{label}</p>
        {description && <p className="text-xs text-muted-foreground font-mono mt-0.5">{description}</p>}
      </div>
      <div
        className={`w-10 h-6 rounded-full border-2 transition-colors relative ${
          checked ? "bg-primary border-primary" : "bg-muted border-border"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
            checked ? "left-5 bg-black" : "left-0.5 bg-muted-foreground"
          }`}
        />
      </div>
    </button>
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

  const {
    data: existingProfile,
    isLoading: profileLoading,
    isError: profileNotFound,
  } = useGetMyTechnicianProfile({ query: { retry: false } as any });
  const createProfile = useCreateTechnicianProfile();
  const updateProfile = useUpdateTechnician();

  // Single effect: wait for query to settle before deciding to populate or create.
  // This prevents the duplicate-profile race where a create fires while the GET is still in flight.
  useEffect(() => {
    if (profileLoading) return; // wait — query not yet resolved

    if (existingProfile) {
      setTechnicianId(existingProfile.id);
      const raw = existingProfile.servicesOffered as ServicesOffered | null;
      setData(prev => ({
        ...prev,
        gender: existingProfile.gender ?? "",
        dateOfBirth: existingProfile.dateOfBirth ?? "",
        languagesSpoken: existingProfile.languagesSpoken?.length ? existingProfile.languagesSpoken : ["English"],
        bio: existingProfile.bio ?? "",
        serviceCity: existingProfile.serviceCity ?? "",
        pinCode: existingProfile.pinCode ?? "",
        serviceRadius: existingProfile.serviceRadius?.toString() ?? "20",
        profession: existingProfile.profession ?? [],
        yearsExperience: existingProfile.yearsExperience?.toString() ?? "",
        certifications: existingProfile.certifications?.join(", ") ?? "",
        previousCompany: existingProfile.previousCompany ?? "",
        areasOfExpertise: existingProfile.areasOfExpertise?.join(", ") ?? "",
        skills: existingProfile.skills?.join(", ") ?? "",
        servicesOffered: raw && typeof raw === "object" ? raw : {},
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
        vacationMode: existingProfile.vacationMode ?? false,
        maxDailyBookings: existingProfile.maxDailyBookings?.toString() ?? "5",
      }));
      setInitializing(false);
      return;
    }

    // Query settled with no profile (404/error) — create one now.
    // The unique constraint on user_id guarantees no duplicates even if called twice.
    if (profileNotFound && !createProfile.isPending && initializing) {
      createProfile.mutateAsync({
        data: { skills: [], hourlyRate: 0, responseTime: "30 min" },
      }).then(profile => {
        setTechnicianId(profile.id);
      }).catch(() => {
        // Profile may already exist (race) — it will be returned from /me on next render
      }).finally(() => setInitializing(false));
    }
  }, [profileLoading, existingProfile, profileNotFound]);

  const set = <K extends keyof WizardData>(key: K, value: WizardData[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const toggleList = (key: "languagesSpoken" | "workingDays" | "profession", val: string) => {
    setData(prev => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const toggleService = (profession: string, service: string) => {
    setData(prev => {
      const current = prev.servicesOffered[profession] ?? [];
      const updated = current.includes(service)
        ? current.filter(s => s !== service)
        : [...current, service];
      return { ...prev, servicesOffered: { ...prev.servicesOffered, [profession]: updated } };
    });
  };

  const addCustomService = (profession: string) => {
    const val = data.customServices[profession]?.trim();
    if (!val) return;
    setData(prev => {
      const current = prev.servicesOffered[profession] ?? [];
      return {
        ...prev,
        servicesOffered: { ...prev.servicesOffered, [profession]: [...current, val] },
        customServices: { ...prev.customServices, [profession]: "" },
      };
    });
  };

  const parseNum = (v: string) => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };
  const parseIntNum = (v: string) => { const n = parseInt(v, 10); return isNaN(n) ? undefined : n; };
  const parseList = (v: string) => v.split(",").map(s => s.trim()).filter(Boolean);

  const buildPreviewTech = () => ({
    id: technicianId ?? 0,
    userId: user?.id ?? 0,
    name: user?.name ?? "",
    bio: data.bio || null,
    avatarUrl: null,
    skills: parseList(data.skills),
    rating: 0,
    reviewCount: 0,
    isAvailable: !data.vacationMode,
    completedJobs: 0,
    hourlyRate: parseNum(data.hourlyRate) ?? 0,
    responseTime: "30 min",
    distance: null,
    categoryIds: [],
    profession: data.profession,
    servicesOffered: data.servicesOffered,
    yearsExperience: parseIntNum(data.yearsExperience) ?? null,
    certifications: parseList(data.certifications),
    previousCompany: data.previousCompany || null,
    areasOfExpertise: parseList(data.areasOfExpertise),
    languagesSpoken: data.languagesSpoken,
    visitCharge: parseNum(data.visitCharge) ?? null,
    perJobRate: parseNum(data.perJobRate) ?? null,
    inspectionCharge: parseNum(data.inspectionCharge) ?? null,
    emergencyCharge: parseNum(data.emergencyCharge) ?? null,
    weekendCharge: parseNum(data.weekendCharge) ?? null,
    nightCharge: parseNum(data.nightCharge) ?? null,
    workingDays: data.workingDays,
    workingHoursStart: data.workingHoursStart || null,
    workingHoursEnd: data.workingHoursEnd || null,
    emergencyAvailable: data.emergencyAvailable,
    vacationMode: data.vacationMode,
    maxDailyBookings: parseIntNum(data.maxDailyBookings) ?? null,
    serviceRadius: parseIntNum(data.serviceRadius) ?? null,
    serviceCity: data.serviceCity || null,
    pinCode: data.pinCode || null,
    gender: data.gender || null,
    dateOfBirth: data.dateOfBirth || null,
  });

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
          servicesOffered: data.servicesOffered as Record<string, string[]>,
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
          vacationMode: data.vacationMode,
          maxDailyBookings: parseIntNum(data.maxDailyBookings),
          serviceCity: data.serviceCity || undefined,
          pinCode: data.pinCode || undefined,
          serviceRadius: parseIntNum(data.serviceRadius),
          gender: data.gender || undefined,
          dateOfBirth: data.dateOfBirth || undefined,
        },
      });
      toast({ title: "Profile Live", description: "Your technician profile is now visible to customers." });
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

  const TOTAL_STEPS = STEP_LABELS.length;
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <p className="text-primary font-mono text-xs uppercase tracking-widest">TECHNICIAN PORTAL</p>
          <h1 className="text-3xl font-bold uppercase mt-1">PROFILE SETUP</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Complete your profile to start receiving jobs — {TOTAL_STEPS} steps total.
          </p>
        </div>

        {/* Step progress */}
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

        <div className="border border-border bg-card rounded-lg p-6 relative overflow-hidden min-h-[420px]">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

          {/* Step 1: Personal + Location */}
          {step === 0 && (
            <div className="space-y-5">
              <SectionHeading>Personal Details & Service Location</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
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
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="Service City / District">
                  <Input
                    placeholder="e.g. Mumbai"
                    value={data.serviceCity}
                    onChange={e => set("serviceCity", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
                <FieldRow label="PIN / ZIP Code">
                  <Input
                    placeholder="e.g. 400001"
                    value={data.pinCode}
                    onChange={e => set("pinCode", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
              </div>
              <FieldRow label={`Service Radius — ${data.serviceRadius} km`}>
                <input
                  type="range" min="1" max="100"
                  value={data.serviceRadius}
                  onChange={e => set("serviceRadius", e.target.value)}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>1 km</span><span>100 km</span>
                </div>
              </FieldRow>
              <FieldRow label="Professional Bio">
                <Textarea
                  placeholder="Describe your experience, specialties, and what sets you apart..."
                  value={data.bio}
                  onChange={e => set("bio", e.target.value)}
                  rows={3}
                  className="bg-background/50 font-mono resize-none"
                />
              </FieldRow>
            </div>
          )}

          {/* Step 2: Expertise */}
          {step === 1 && (
            <div className="space-y-5">
              <SectionHeading>Professional Expertise</SectionHeading>
              <FieldRow label="Profession / Specialisation (select all that apply)">
                <div className="flex flex-wrap gap-2">
                  {PROFESSIONS.map(p => (
                    <ToggleChip
                      key={p}
                      label={p}
                      active={data.profession.includes(p)}
                      onClick={() => toggleList("profession", p)}
                    />
                  ))}
                </div>
                {data.profession.length > 0 && (
                  <p className="text-xs font-mono text-primary mt-2">
                    {data.profession.length} selected — pick services for each in Step 3
                  </p>
                )}
              </FieldRow>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="Years of Experience">
                  <Input
                    type="number" min="0" max="60" placeholder="e.g. 5"
                    value={data.yearsExperience}
                    onChange={e => set("yearsExperience", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
                <FieldRow label="Previous Company">
                  <Input
                    placeholder="e.g. Whirlpool Service"
                    value={data.previousCompany}
                    onChange={e => set("previousCompany", e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </FieldRow>
              </div>
              <FieldRow label="Certifications (comma-separated)">
                <Input
                  placeholder="e.g. ITI Electrician, RAC Diploma, CompTIA A+"
                  value={data.certifications}
                  onChange={e => set("certifications", e.target.value)}
                  className="bg-background/50 font-mono"
                />
              </FieldRow>
              <FieldRow label="Areas of Expertise (comma-separated)">
                <Input
                  placeholder="e.g. Split AC, Water purifiers, iPhone repair"
                  value={data.areasOfExpertise}
                  onChange={e => set("areasOfExpertise", e.target.value)}
                  className="bg-background/50 font-mono"
                />
              </FieldRow>
              <FieldRow label="Tools & Skills (comma-separated)">
                <Input
                  placeholder="e.g. Multimeter, Soldering iron, Oscilloscope"
                  value={data.skills}
                  onChange={e => set("skills", e.target.value)}
                  className="bg-background/50 font-mono"
                />
              </FieldRow>
            </div>
          )}

          {/* Step 3: Services per profession */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionHeading>Services Offered</SectionHeading>
              {data.profession.length === 0 ? (
                <div className="py-8 text-center border border-border/40 rounded-lg bg-muted/10">
                  <p className="text-xs font-mono text-muted-foreground">
                    No professions selected — go back to Step 2 to pick your specialisations.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3 font-mono text-xs uppercase" onClick={() => setStep(1)}>
                    ← Back to Expertise
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                  {data.profession.map(prof => {
                    const presets = PROFESSION_SERVICES[prof] ?? [];
                    const selected = data.servicesOffered[prof] ?? [];
                    return (
                      <div key={prof} className="border border-border/50 rounded-lg p-4 space-y-3">
                        <h4 className="font-mono text-sm font-bold text-primary uppercase">{prof}</h4>
                        <div className="flex flex-wrap gap-2">
                          {presets.map(svc => (
                            <ToggleChip
                              key={svc}
                              label={svc}
                              active={selected.includes(svc)}
                              onClick={() => toggleService(prof, svc)}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom service..."
                            value={data.customServices[prof] ?? ""}
                            onChange={e =>
                              setData(prev => ({
                                ...prev,
                                customServices: { ...prev.customServices, [prof]: e.target.value },
                              }))
                            }
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomService(prof); } }}
                            className="bg-background/50 font-mono text-xs h-8"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 font-mono text-xs shrink-0"
                            onClick={() => addCustomService(prof)}
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add
                          </Button>
                        </div>
                        {selected.filter(s => !presets.includes(s)).map(s => (
                          <span key={s} className="inline-flex items-center gap-1 text-[10px] font-mono border border-primary/40 px-2 py-0.5 rounded text-primary bg-primary/10 mr-1.5 mb-1">
                            {s}
                            <button type="button" onClick={() => toggleService(prof, s)}>
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {selected.length} service{selected.length !== 1 ? "s" : ""} selected
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Pricing */}
          {step === 3 && (
            <div className="space-y-5">
              <SectionHeading>Pricing Structure</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "hourlyRate" as const,      label: "Hourly Rate ($)",          ph: "e.g. 75" },
                  { key: "perJobRate" as const,       label: "Per-Job Flat Rate ($)",    ph: "e.g. 120" },
                  { key: "visitCharge" as const,      label: "Visit / Call-out Fee ($)", ph: "e.g. 25" },
                  { key: "inspectionCharge" as const, label: "Inspection Fee ($)",       ph: "e.g. 40" },
                  { key: "emergencyCharge" as const,  label: "Emergency Surcharge ($)",  ph: "e.g. 50" },
                  { key: "weekendCharge" as const,    label: "Weekend Surcharge ($)",    ph: "e.g. 30" },
                  { key: "nightCharge" as const,      label: "Night Surcharge ($)",      ph: "e.g. 35" },
                ].map(({ key, label, ph }) => (
                  <FieldRow key={key} label={label}>
                    <Input
                      type="number" min="0" placeholder={ph}
                      value={data[key]}
                      onChange={e => set(key, e.target.value)}
                      className="bg-background/50 font-mono"
                    />
                  </FieldRow>
                ))}
              </div>
              <div className="border border-border/40 rounded p-3 bg-muted/10">
                <p className="text-xs font-mono text-muted-foreground">
                  All rates in USD. Surcharges stack on top of your base rate. Customers see these before booking.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Schedule */}
          {step === 4 && (
            <div className="space-y-4">
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
                  type="number" min="1" max="20"
                  value={data.maxDailyBookings}
                  onChange={e => set("maxDailyBookings", e.target.value)}
                  className="bg-background/50 font-mono max-w-xs"
                />
              </FieldRow>
              <ToggleSwitch
                checked={data.emergencyAvailable}
                onChange={v => set("emergencyAvailable", v)}
                label="Emergency / 24-7 Available"
                description="Accept urgent calls outside working hours — emergency surcharge applies"
                icon={<Zap className="w-5 h-5" />}
              />
              <ToggleSwitch
                checked={data.vacationMode}
                onChange={v => set("vacationMode", v)}
                label="Vacation Mode"
                description="Pause all incoming bookings temporarily while you're away"
                icon={<span className="text-lg">🏖</span>}
              />
            </div>
          )}

          {/* Step 6: Profile Preview */}
          {step === 5 && (
            <div className="space-y-5">
              <SectionHeading>Your Public Profile Preview</SectionHeading>
              <p className="text-xs font-mono text-muted-foreground">
                This is exactly how customers will see your profile when browsing technicians.
              </p>
              <TechnicianProfileCard technician={buildPreviewTech()} />
              <div className="border border-yellow-400/20 bg-yellow-400/5 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs font-mono text-muted-foreground">
                  You can update any of these details later from <strong>Settings → Technician Profile</strong>.
                  Click <strong>LAUNCH PROFILE</strong> to go live.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-5 flex justify-between gap-4">
          <Button
            variant="outline"
            className="uppercase font-mono"
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {!isLastStep ? (
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

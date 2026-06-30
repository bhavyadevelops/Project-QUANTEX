import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  useUpdateUser,
  useGetMyTechnicianProfile,
  useUpdateTechnician,
} from "@workspace/api-client-react";
import { PROFESSIONS, PROFESSION_SERVICES } from "@/pages/technician/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  User, Phone, Loader2, Save, Zap, DollarSign, Clock, MapPin, Briefcase, PlusCircle, X,
} from "lucide-react";

const settingsSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
});

const techSchema = z.object({
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bio: z.string().optional(),
  yearsExperience: z.string().optional(),
  previousCompany: z.string().optional(),
  certifications: z.string().optional(),
  areasOfExpertise: z.string().optional(),
  skills: z.string().optional(),
  languagesSpoken: z.string().optional(),
  hourlyRate: z.string().optional(),
  perJobRate: z.string().optional(),
  visitCharge: z.string().optional(),
  inspectionCharge: z.string().optional(),
  emergencyCharge: z.string().optional(),
  weekendCharge: z.string().optional(),
  nightCharge: z.string().optional(),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  maxDailyBookings: z.string().optional(),
  serviceCity: z.string().optional(),
  pinCode: z.string().optional(),
  serviceRadius: z.string().optional(),
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

type ServicesOffered = Record<string, string[]>;

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

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 w-full border rounded-lg p-3 transition-colors ${
        checked
          ? "border-primary bg-primary/10"
          : "border-border bg-background/50 hover:border-primary/40"
      }`}
    >
      <div className="text-left flex-1">
        <p className={`font-mono text-xs font-bold uppercase ${checked ? "text-primary" : ""}`}>{label}</p>
        {description && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{description}</p>}
      </div>
      <div
        className={`w-9 h-5 rounded-full border-2 transition-colors relative shrink-0 ${
          checked ? "bg-primary border-primary" : "bg-muted border-border"
        }`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
            checked ? "left-4 bg-black" : "left-0.5 bg-muted-foreground"
          }`}
        />
      </div>
    </button>
  );
}

function SectionDivider({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 border-t border-border/40 pt-5 mt-1">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-mono uppercase text-muted-foreground tracking-widest">{label}</span>
    </div>
  );
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const updateUser = useUpdateUser();
  const updateTechnician = useUpdateTechnician();

  const isTech = user?.role === "technician";
  const { data: techProfile, isLoading: techLoading } = useGetMyTechnicianProfile({
    query: { enabled: isTech, retry: false } as any,
  });

  // Technician-specific state (controlled outside form for dynamic fields)
  const [profession, setProfession] = useState<string[]>([]);
  const [servicesOffered, setServicesOffered] = useState<ServicesOffered>({});
  const [customServices, setCustomServices] = useState<Record<string, string>>({});
  const [workingDays, setWorkingDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [emergencyAvailable, setEmergencyAvailable] = useState(false);
  const [vacationMode, setVacationMode] = useState(false);

  React.useEffect(() => {
    if (techProfile) {
      setProfession(techProfile.profession ?? []);
      const raw = techProfile.servicesOffered as ServicesOffered | null;
      setServicesOffered(raw && typeof raw === "object" ? raw : {});
      setWorkingDays(techProfile.workingDays?.length ? techProfile.workingDays : ["Mon", "Tue", "Wed", "Thu", "Fri"]);
      setEmergencyAvailable(techProfile.emergencyAvailable ?? false);
      setVacationMode(techProfile.vacationMode ?? false);
    }
  }, [techProfile]);

  const toggleService = (prof: string, service: string) => {
    setServicesOffered(prev => {
      const current = prev[prof] ?? [];
      const updated = current.includes(service)
        ? current.filter(s => s !== service)
        : [...current, service];
      return { ...prev, [prof]: updated };
    });
  };

  const addCustomService = (prof: string) => {
    const val = customServices[prof]?.trim();
    if (!val) return;
    setServicesOffered(prev => ({
      ...prev,
      [prof]: [...(prev[prof] ?? []), val],
    }));
    setCustomServices(prev => ({ ...prev, [prof]: "" }));
  };

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const techForm = useForm<z.infer<typeof techSchema>>({
    resolver: zodResolver(techSchema),
    values: techProfile
      ? {
          gender: techProfile.gender ?? "",
          dateOfBirth: techProfile.dateOfBirth ?? "",
          bio: techProfile.bio ?? "",
          yearsExperience: techProfile.yearsExperience?.toString() ?? "",
          previousCompany: techProfile.previousCompany ?? "",
          certifications: techProfile.certifications?.join(", ") ?? "",
          areasOfExpertise: techProfile.areasOfExpertise?.join(", ") ?? "",
          skills: techProfile.skills?.join(", ") ?? "",
          languagesSpoken: techProfile.languagesSpoken?.join(", ") ?? "",
          hourlyRate: techProfile.hourlyRate?.toString() ?? "",
          perJobRate: techProfile.perJobRate?.toString() ?? "",
          visitCharge: techProfile.visitCharge?.toString() ?? "",
          inspectionCharge: techProfile.inspectionCharge?.toString() ?? "",
          emergencyCharge: techProfile.emergencyCharge?.toString() ?? "",
          weekendCharge: techProfile.weekendCharge?.toString() ?? "",
          nightCharge: techProfile.nightCharge?.toString() ?? "",
          workingHoursStart: techProfile.workingHoursStart ?? "09:00",
          workingHoursEnd: techProfile.workingHoursEnd ?? "18:00",
          maxDailyBookings: techProfile.maxDailyBookings?.toString() ?? "",
          serviceCity: techProfile.serviceCity ?? "",
          pinCode: techProfile.pinCode ?? "",
          serviceRadius: techProfile.serviceRadius?.toString() ?? "20",
        }
      : {},
  });

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    if (!user?.id) return;
    try {
      const updated = await updateUser.mutateAsync({
        id: user.id,
        data: { name: values.name, phone: values.phone || null },
      });
      setUser(updated);
      toast({ title: t("set_save"), description: "Changes saved." });
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const parseNum = (v?: string) => { if (!v) return undefined; const n = parseFloat(v); return isNaN(n) ? undefined : n; };
  const parseIntNum = (v?: string) => { if (!v) return undefined; const n = parseInt(v, 10); return isNaN(n) ? undefined : n; };
  const parseList = (v?: string) => v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];

  const onTechSubmit = async (values: z.infer<typeof techSchema>) => {
    if (!techProfile?.id) return;
    try {
      await updateTechnician.mutateAsync({
        id: techProfile.id,
        data: {
          gender: values.gender || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
          bio: values.bio || undefined,
          yearsExperience: parseIntNum(values.yearsExperience),
          previousCompany: values.previousCompany || undefined,
          certifications: parseList(values.certifications),
          areasOfExpertise: parseList(values.areasOfExpertise),
          skills: parseList(values.skills),
          languagesSpoken: parseList(values.languagesSpoken),
          profession,
          servicesOffered,
          hourlyRate: parseNum(values.hourlyRate),
          perJobRate: parseNum(values.perJobRate),
          visitCharge: parseNum(values.visitCharge),
          inspectionCharge: parseNum(values.inspectionCharge),
          emergencyCharge: parseNum(values.emergencyCharge),
          weekendCharge: parseNum(values.weekendCharge),
          nightCharge: parseNum(values.nightCharge),
          workingDays,
          workingHoursStart: values.workingHoursStart || undefined,
          workingHoursEnd: values.workingHoursEnd || undefined,
          emergencyAvailable,
          vacationMode,
          maxDailyBookings: parseIntNum(values.maxDailyBookings),
          serviceCity: values.serviceCity || undefined,
          pinCode: values.pinCode || undefined,
          serviceRadius: parseIntNum(values.serviceRadius),
          responseTime: "30 min",
        },
      });
      toast({ title: "Profile Updated", description: "Technician profile saved." });
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8">
          <p className="text-primary font-mono text-sm uppercase tracking-widest">{t("set_label")}</p>
          <h1 className="text-3xl font-bold uppercase mt-1">{t("set_title")}</h1>
        </div>

        {/* Account profile */}
        <div className="border border-border bg-card rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary font-mono">{user?.name?.charAt(0) ?? "U"}</span>
            </div>
            <div>
              <p className="font-bold uppercase text-lg">{user?.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{user?.role?.toUpperCase()} ACCOUNT</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{user?.email}</p>
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono uppercase text-xs">{t("set_name")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9 bg-background/50 font-mono" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono uppercase text-xs">{t("set_phone")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9 bg-background/50 font-mono" placeholder="+1 (555) 000-0000" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <p className="text-xs text-muted-foreground font-mono border border-border/50 px-3 py-2 rounded bg-muted/20">
                {t("set_email_note")} {user?.email} {t("set_contact")}
              </p>
              <Button type="submit" disabled={updateUser.isPending} className="uppercase font-bold font-mono px-8">
                {updateUser.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("set_saving")}</>
                  : <><Save className="w-4 h-4 mr-2" />{t("set_save")}</>}
              </Button>
            </form>
          </Form>
        </div>

        {/* Technician profile */}
        {isTech && (
          <div className="border border-primary/30 bg-card rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-primary" />
              <h2 className="font-bold uppercase font-mono text-sm text-primary">Technician Profile</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">
              All fields from the onboarding wizard — edit and save any time.
            </p>

            {techLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !techProfile ? (
              <div className="py-6 text-center border border-border/40 rounded-lg bg-muted/10">
                <p className="text-xs font-mono text-muted-foreground mb-3">No technician profile found.</p>
                <Button size="sm" className="font-mono uppercase text-xs" asChild>
                  <a href="/technician/onboarding">Complete Onboarding</a>
                </Button>
              </div>
            ) : (
              <Form {...techForm}>
                <form onSubmit={techForm.handleSubmit(onTechSubmit)} className="space-y-5">

                  {/* Personal */}
                  <SectionDivider icon={<User className="w-3.5 h-3.5" />} label="Personal" />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={techForm.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono uppercase text-xs">Gender</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-1.5">
                            {GENDER_OPTIONS.map(g => (
                              <ToggleChip key={g} label={g} active={field.value === g}
                                onClick={() => field.onChange(g)} />
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={techForm.control} name="dateOfBirth" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono uppercase text-xs">Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" className="bg-background/50 font-mono" {...field} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={techForm.control} name="bio" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs">Professional Bio</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your experience..." rows={3} className="bg-background/50 font-mono resize-none" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />

                  {/* Expertise */}
                  <SectionDivider icon={<Briefcase className="w-3.5 h-3.5" />} label="Expertise" />
                  <div>
                    <label className="text-xs font-mono uppercase text-muted-foreground block mb-2">Profession / Specialisation</label>
                    <div className="flex flex-wrap gap-2">
                      {PROFESSIONS.map(p => (
                        <ToggleChip key={p} label={p} active={profession.includes(p)}
                          onClick={() => setProfession(prev =>
                            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                          )} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={techForm.control} name="yearsExperience" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono uppercase text-xs">Years Experience</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="e.g. 5" className="bg-background/50 font-mono" {...field} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={techForm.control} name="previousCompany" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono uppercase text-xs">Previous Company</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Whirlpool Service" className="bg-background/50 font-mono" {...field} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={techForm.control} name="certifications" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs">Certifications (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ITI Electrician, RAC Diploma..." className="bg-background/50 font-mono" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={techForm.control} name="areasOfExpertise" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs">Areas of Expertise (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Split AC, Water purifiers..." className="bg-background/50 font-mono" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={techForm.control} name="skills" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs">Tools & Skills (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Multimeter, Soldering iron..." className="bg-background/50 font-mono" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={techForm.control} name="languagesSpoken" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs">Languages (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. English, Hindi, Spanish..." className="bg-background/50 font-mono" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />

                  {/* Services */}
                  {profession.length > 0 && (
                    <>
                      <SectionDivider icon={<span className="text-xs">🔧</span>} label="Services Offered" />
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {profession.map(prof => {
                          const presets = PROFESSION_SERVICES[prof] ?? [];
                          const selected = servicesOffered[prof] ?? [];
                          return (
                            <div key={prof} className="border border-border/50 rounded-lg p-3 space-y-2">
                              <h4 className="font-mono text-xs font-bold text-primary uppercase">{prof}</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {presets.map(svc => (
                                  <ToggleChip key={svc} label={svc} active={selected.includes(svc)}
                                    onClick={() => toggleService(prof, svc)} />
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Add custom service..."
                                  value={customServices[prof] ?? ""}
                                  onChange={e => setCustomServices(prev => ({ ...prev, [prof]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomService(prof); } }}
                                  className="bg-background/50 font-mono text-xs h-7"
                                />
                                <Button type="button" variant="outline" size="sm" className="h-7 px-2 font-mono text-xs shrink-0"
                                  onClick={() => addCustomService(prof)}>
                                  <PlusCircle className="w-3 h-3" />
                                </Button>
                              </div>
                              {selected.filter(s => !presets.includes(s)).map(s => (
                                <span key={s} className="inline-flex items-center gap-1 text-[10px] font-mono border border-primary/40 px-2 py-0.5 rounded text-primary bg-primary/10 mr-1">
                                  {s}<button type="button" onClick={() => toggleService(prof, s)}><X className="w-2.5 h-2.5" /></button>
                                </span>
                              ))}
                              <p className="text-[10px] font-mono text-muted-foreground">{selected.length} selected</p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Pricing */}
                  <SectionDivider icon={<DollarSign className="w-3.5 h-3.5" />} label="Pricing" />
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: "hourlyRate" as const,      label: "Hourly Rate ($)" },
                      { name: "perJobRate" as const,       label: "Per-Job Rate ($)" },
                      { name: "visitCharge" as const,      label: "Visit Fee ($)" },
                      { name: "inspectionCharge" as const, label: "Inspection Fee ($)" },
                      { name: "emergencyCharge" as const,  label: "Emergency Surcharge ($)" },
                      { name: "weekendCharge" as const,    label: "Weekend Surcharge ($)" },
                      { name: "nightCharge" as const,      label: "Night Surcharge ($)" },
                    ].map(({ name, label }) => (
                      <FormField key={name} control={techForm.control} name={name} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">{label}</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" className="bg-background/50 font-mono" {...field} />
                          </FormControl>
                        </FormItem>
                      )} />
                    ))}
                  </div>

                  {/* Schedule */}
                  <SectionDivider icon={<Clock className="w-3.5 h-3.5" />} label="Schedule" />
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-mono uppercase text-muted-foreground block mb-2">Working Days</label>
                      <div className="flex gap-2 flex-wrap">
                        {DAYS.map(d => (
                          <ToggleChip key={d} label={d} active={workingDays.includes(d)}
                            onClick={() => setWorkingDays(prev =>
                              prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                            )} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={techForm.control} name="workingHoursStart" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">Start Time</FormLabel>
                          <FormControl><Input type="time" className="bg-background/50 font-mono" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={techForm.control} name="workingHoursEnd" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">End Time</FormLabel>
                          <FormControl><Input type="time" className="bg-background/50 font-mono" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={techForm.control} name="maxDailyBookings" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">Max Daily Jobs</FormLabel>
                          <FormControl><Input type="number" min="1" max="20" placeholder="5" className="bg-background/50 font-mono" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <ToggleSwitch checked={emergencyAvailable} onChange={setEmergencyAvailable}
                      label="Emergency / 24-7 Available" description="Accept urgent calls outside working hours" />
                    <ToggleSwitch checked={vacationMode} onChange={setVacationMode}
                      label="Vacation Mode" description="Pause all incoming bookings temporarily" />
                  </div>

                  {/* Coverage */}
                  <SectionDivider icon={<MapPin className="w-3.5 h-3.5" />} label="Coverage Area" />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={techForm.control} name="serviceCity" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono uppercase text-xs">City / District</FormLabel>
                        <FormControl><Input placeholder="e.g. Mumbai" className="bg-background/50 font-mono" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={techForm.control} name="pinCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono uppercase text-xs">PIN / ZIP Code</FormLabel>
                        <FormControl><Input placeholder="e.g. 400001" className="bg-background/50 font-mono" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={techForm.control} name="serviceRadius" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono uppercase text-xs">Radius (km)</FormLabel>
                        <FormControl><Input type="number" min="1" max="200" placeholder="20" className="bg-background/50 font-mono" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <Button type="submit" disabled={updateTechnician.isPending} className="uppercase font-bold font-mono px-8 mt-2">
                    {updateTechnician.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
                      : <><Save className="w-4 h-4 mr-2" />Save Profile</>}
                  </Button>
                </form>
              </Form>
            )}
          </div>
        )}

        {/* Account info */}
        <div className="border border-border bg-card rounded-lg p-6">
          <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">{t("set_account_info")}</h2>
          <div className="space-y-3">
            {[
              { label: t("set_type"),  value: user?.role?.toUpperCase() },
              { label: t("set_since"), value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A" },
              { label: t("set_id"),    value: `#QX-${String(user?.id ?? 0).padStart(5, "0")}` },
            ].map((r) => (
              <div key={r.label} className="flex justify-between py-2 border-b border-border/40">
                <span className="text-xs font-mono text-muted-foreground uppercase">{r.label}</span>
                <span className="text-xs font-mono font-bold text-primary">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

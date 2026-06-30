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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Loader2, Save, Zap, DollarSign, Clock, MapPin, Briefcase } from "lucide-react";

const settingsSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
});

const techSchema = z.object({
  bio: z.string().optional(),
  hourlyRate: z.string().optional(),
  visitCharge: z.string().optional(),
  serviceCity: z.string().optional(),
  serviceRadius: z.string().optional(),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  yearsExperience: z.string().optional(),
  certifications: z.string().optional(),
  skills: z.string().optional(),
  languagesSpoken: z.string().optional(),
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  const [workingDays, setWorkingDays] = useState<string[]>(
    techProfile?.workingDays?.length ? techProfile.workingDays : ["Mon", "Tue", "Wed", "Thu", "Fri"]
  );
  const [emergencyAvailable, setEmergencyAvailable] = useState(techProfile?.emergencyAvailable ?? false);
  const [vacationMode, setVacationMode] = useState(techProfile?.vacationMode ?? false);

  React.useEffect(() => {
    if (techProfile) {
      setWorkingDays(techProfile.workingDays?.length ? techProfile.workingDays : ["Mon", "Tue", "Wed", "Thu", "Fri"]);
      setEmergencyAvailable(techProfile.emergencyAvailable ?? false);
      setVacationMode(techProfile.vacationMode ?? false);
    }
  }, [techProfile]);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const techForm = useForm<z.infer<typeof techSchema>>({
    resolver: zodResolver(techSchema),
    values: techProfile
      ? {
          bio: techProfile.bio ?? "",
          hourlyRate: techProfile.hourlyRate?.toString() ?? "",
          visitCharge: techProfile.visitCharge?.toString() ?? "",
          serviceCity: techProfile.serviceCity ?? "",
          serviceRadius: techProfile.serviceRadius?.toString() ?? "",
          workingHoursStart: techProfile.workingHoursStart ?? "09:00",
          workingHoursEnd: techProfile.workingHoursEnd ?? "18:00",
          yearsExperience: techProfile.yearsExperience?.toString() ?? "",
          certifications: techProfile.certifications?.join(", ") ?? "",
          skills: techProfile.skills?.join(", ") ?? "",
          languagesSpoken: techProfile.languagesSpoken?.join(", ") ?? "",
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
          bio: values.bio || undefined,
          hourlyRate: parseNum(values.hourlyRate),
          visitCharge: parseNum(values.visitCharge),
          serviceCity: values.serviceCity || undefined,
          serviceRadius: parseIntNum(values.serviceRadius),
          workingHoursStart: values.workingHoursStart || undefined,
          workingHoursEnd: values.workingHoursEnd || undefined,
          workingDays,
          emergencyAvailable,
          vacationMode,
          yearsExperience: parseIntNum(values.yearsExperience),
          certifications: parseList(values.certifications),
          skills: parseList(values.skills),
          languagesSpoken: parseList(values.languagesSpoken),
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
                {updateUser.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("set_saving")}</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />{t("set_save")}</>
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Technician profile section */}
        {isTech && (
          <div className="border border-primary/30 bg-card rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Briefcase className="w-4 h-4 text-primary" />
              <h2 className="font-bold uppercase font-mono text-sm text-primary">Technician Profile</h2>
            </div>

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
                  {/* Expertise */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono uppercase text-muted-foreground">Expertise</span>
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
                      <FormField control={techForm.control} name="skills" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">Skills (comma-separated)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Wiring, HVAC..." className="bg-background/50 font-mono" {...field} />
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <div className="mt-4 space-y-3">
                      <FormField control={techForm.control} name="certifications" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">Certifications (comma-separated)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. OSHA 10, EPA 608..." className="bg-background/50 font-mono" {...field} />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={techForm.control} name="languagesSpoken" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">Languages (comma-separated)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. English, Spanish..." className="bg-background/50 font-mono" {...field} />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={techForm.control} name="bio" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">Professional Bio</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe your experience..." rows={3} className="bg-background/50 font-mono resize-none" {...field} />
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="border-t border-border/40 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono uppercase text-muted-foreground">Pricing</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={techForm.control} name="hourlyRate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">Hourly Rate ($)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="e.g. 75" className="bg-background/50 font-mono" {...field} />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={techForm.control} name="visitCharge" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">Visit Fee ($)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="e.g. 25" className="bg-background/50 font-mono" {...field} />
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="border-t border-border/40 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono uppercase text-muted-foreground">Schedule</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-mono uppercase text-muted-foreground block mb-2">Working Days</label>
                        <div className="flex gap-2 flex-wrap">
                          {DAYS.map(d => (
                            <ToggleChip
                              key={d}
                              label={d}
                              active={workingDays.includes(d)}
                              onClick={() =>
                                setWorkingDays(prev =>
                                  prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                                )
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={techForm.control} name="workingHoursStart" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono uppercase text-xs">Start Time</FormLabel>
                            <FormControl>
                              <Input type="time" className="bg-background/50 font-mono" {...field} />
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={techForm.control} name="workingHoursEnd" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono uppercase text-xs">End Time</FormLabel>
                            <FormControl>
                              <Input type="time" className="bg-background/50 font-mono" {...field} />
                            </FormControl>
                          </FormItem>
                        )} />
                      </div>
                      <ToggleSwitch
                        checked={emergencyAvailable}
                        onChange={setEmergencyAvailable}
                        label="Emergency / 24-7 Available"
                        description="Accept urgent calls outside working hours"
                      />
                      <ToggleSwitch
                        checked={vacationMode}
                        onChange={setVacationMode}
                        label="Vacation Mode"
                        description="Pause all incoming bookings temporarily"
                      />
                    </div>
                  </div>

                  {/* Coverage */}
                  <div className="border-t border-border/40 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono uppercase text-muted-foreground">Coverage Area</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={techForm.control} name="serviceCity" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">City / District</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. San Francisco" className="bg-background/50 font-mono" {...field} />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={techForm.control} name="serviceRadius" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-xs">Service Radius (km)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="200" placeholder="e.g. 20" className="bg-background/50 font-mono" {...field} />
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Button type="submit" disabled={updateTechnician.isPending} className="uppercase font-bold font-mono px-8">
                    {updateTechnician.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" />Save Profile</>
                    )}
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

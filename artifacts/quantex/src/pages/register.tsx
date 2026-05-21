import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["customer", "technician"]),
  phone: z.string().optional(),
});

export default function Register() {
  const [_, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "customer", phone: "" },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      const response = await registerMutation.mutateAsync({
        data: { name: values.name, email: values.email, password: values.password, role: values.role, phone: values.phone || undefined }
      });
      setUser(response.user, response.token);
      toast({ title: "Access Granted", description: "Welcome to QUANTEX." });
      setLocation(response.user.role === "technician" ? "/technician/dashboard" : "/dashboard");
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message || "Failed to create account.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-primary">{t("register_title")}</h1>
          <p className="mt-2 text-muted-foreground font-mono text-sm uppercase">{t("register_subtitle")}</p>
        </div>

        <div className="bg-card border border-border p-8 rounded-lg shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-mono uppercase text-xs">{t("register_access_level")}</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                      {(["customer", "technician"] as const).map((r) => (
                        <FormItem key={r}>
                          <FormControl>
                            <div className={`border p-4 rounded-md cursor-pointer transition-colors ${field.value === r ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:border-primary/50"}`}>
                              <RadioGroupItem value={r} id={r} className="sr-only" />
                              <label htmlFor={r} className="font-mono text-sm uppercase font-bold cursor-pointer block text-center capitalize">{r}</label>
                            </div>
                          </FormControl>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {([
                { name: "name",     label: t("register_name"),     type: "text",     ph: "John Doe" },
                { name: "email",    label: t("register_email"),    type: "email",    ph: "operator@quantex.net" },
                { name: "phone",    label: t("register_phone"),    type: "text",     ph: "+1 (555) 000-0000" },
                { name: "password", label: t("register_password"), type: "password", ph: "••••••••" },
              ] as const).map((f) => (
                <FormField key={f.name} control={form.control} name={f.name} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs">{f.label}</FormLabel>
                    <FormControl>
                      <Input type={f.type} placeholder={f.ph} className="bg-background/50 border-input font-mono" autoComplete={f.name === "password" ? "new-password" : undefined} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}

              <Button type="submit" className="w-full uppercase font-bold tracking-wider" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? t("register_loading") : t("register_btn")}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center font-mono text-sm">
            <p className="text-muted-foreground">
              {t("register_existing")}{" "}
              <Link href="/login" className="text-primary hover:underline">{t("register_login_link")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function Login() {
  const [_, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const response = await loginMutation.mutateAsync({ data: values });
      setUser(response.user, response.token);
      toast({ title: "Access Granted", description: "Welcome back to QUANTEX." });
      setLocation(response.user.role === "technician" ? "/technician/dashboard" : "/dashboard");
    } catch (error: any) {
      toast({ title: "Access Denied", description: error.message || "Invalid credentials.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-primary">{t("login_title")}</h1>
          <p className="mt-2 text-muted-foreground font-mono text-sm uppercase">{t("login_subtitle")}</p>
        </div>

        <div className="bg-card border border-border p-8 rounded-lg shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono uppercase text-xs">{t("login_email")}</FormLabel>
                  <FormControl>
                    <Input placeholder="operator@quantex.net" className="bg-background/50 border-input font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono uppercase text-xs">{t("login_password")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="bg-background/50 border-input font-mono tracking-widest" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full uppercase font-bold tracking-wider" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? t("login_loading") : t("login_btn")}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center font-mono text-sm">
            <p className="text-muted-foreground">
              {t("login_new")}{" "}
              <Link href="/register" className="text-primary hover:underline">{t("login_register_link")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

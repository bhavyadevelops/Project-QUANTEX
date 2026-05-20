import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useUpdateUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Loader2, Save } from "lucide-react";

const settingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

export default function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const updateUser = useUpdateUser();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
    },
  });

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    if (!user?.id) return;
    try {
      const updated = await updateUser.mutateAsync({
        id: user.id,
        data: {
          name: values.name,
          phone: values.phone || null,
        }
      });
      setUser(updated);
      toast({ title: "Profile Updated", description: "Your settings have been saved." });
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8">
          <p className="text-primary font-mono text-sm uppercase tracking-widest">Account Management</p>
          <h1 className="text-3xl font-bold uppercase mt-1">Profile Settings</h1>
        </div>

        <div className="border border-border bg-card rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary font-mono">
                {user?.name?.charAt(0) ?? "U"}
              </span>
            </div>
            <div>
              <p className="font-bold uppercase text-lg">{user?.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{user?.role?.toUpperCase()} ACCOUNT</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{user?.email}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs">Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-9 bg-background/50 font-mono" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs">Phone Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-9 bg-background/50 font-mono" placeholder="+1 (555) 000-0000" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-xs text-muted-foreground font-mono border border-border/50 px-3 py-2 rounded bg-muted/20">
                Email: {user?.email} (contact support to change)
              </p>

              <Button type="submit" disabled={updateUser.isPending} className="uppercase font-bold font-mono px-8">
                {updateUser.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Save Changes</>
                )}
              </Button>
            </form>
          </Form>
        </div>

        <div className="border border-border bg-card rounded-lg p-6">
          <h2 className="font-bold uppercase font-mono text-sm mb-4 text-primary">Account Info</h2>
          <div className="space-y-3">
            {[
              { label: "Account Type",  value: user?.role?.toUpperCase() },
              { label: "Member Since",  value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A" },
              { label: "Account ID",    value: `#QX-${String(user?.id ?? 0).padStart(5, "0")}` },
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

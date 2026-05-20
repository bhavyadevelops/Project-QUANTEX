import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["customer", "technician"]),
  phone: z.string().optional(),
});

export default function Register() {
  const [_, setLocation] = useLocation();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "customer", phone: "" },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      const response = await registerMutation.mutateAsync({
        data: {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role === "customer" ? "customer" : "technician",
          phone: values.phone || undefined,
        }
      });
      setUser(response.user, response.token);
      toast({ title: "Access Granted", description: "Welcome to QUANTEX." });
      setLocation(response.user.role === "technician" ? "/technician/dashboard" : "/dashboard");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-primary">Network Registration</h1>
          <p className="mt-2 text-muted-foreground font-mono text-sm uppercase">Request access to QUANTEX services</p>
        </div>

        <div className="bg-card border border-border p-8 rounded-lg shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-mono uppercase text-xs">Access Level</FormLabel>
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
                )}
              />

              {(["name", "email", "phone", "password"] as const).map((fieldName) => (
                <FormField
                  key={fieldName}
                  control={form.control}
                  name={fieldName}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs">
                        {fieldName === "password" ? "Security Key" : fieldName === "phone" ? "Phone (Optional)" : fieldName === "name" ? "Full Name" : "Email Address"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={fieldName === "password" ? "password" : fieldName === "email" ? "email" : "text"}
                          placeholder={fieldName === "password" ? "••••••••" : fieldName === "email" ? "operator@quantex.net" : fieldName === "phone" ? "+1 (555) 000-0000" : "John Doe"}
                          className="bg-background/50 border-input font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <Button type="submit" className="w-full uppercase font-bold tracking-wider" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Processing..." : "Create Identity"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center font-mono text-sm">
            <p className="text-muted-foreground">
              Already authorized?{" "}
              <Link href="/login" className="text-primary hover:underline">Initialize Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

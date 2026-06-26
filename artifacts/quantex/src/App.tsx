import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Services from "@/pages/services";
import Reviews from "@/pages/reviews";
import About from "@/pages/about";

import CustomerDashboard from "@/pages/dashboard";
import BookTechnician from "@/pages/book";
import AIAssistant from "@/pages/ai-assistant";
import Tracking from "@/pages/tracking";
import History from "@/pages/history";
import Settings from "@/pages/settings";

import TechnicianDashboard from "@/pages/technician/dashboard";
import TechnicianBookings from "@/pages/technician/bookings";
import Analytics from "@/pages/analytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/services" component={Services} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/about" component={About} />

      <Route path="/dashboard">
        <ProtectedRoute allowedRoles={["customer"]}><CustomerDashboard /></ProtectedRoute>
      </Route>
      <Route path="/book">
        <ProtectedRoute allowedRoles={["customer"]}><BookTechnician /></ProtectedRoute>
      </Route>
      <Route path="/ai-assistant">
        <ProtectedRoute allowedRoles={["customer"]}><AIAssistant /></ProtectedRoute>
      </Route>
      <Route path="/tracking/:id">
        <ProtectedRoute allowedRoles={["customer"]}><Tracking /></ProtectedRoute>
      </Route>
      <Route path="/history">
        <ProtectedRoute allowedRoles={["customer"]}><History /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute allowedRoles={["customer", "technician"]}><Settings /></ProtectedRoute>
      </Route>
      <Route path="/technician/dashboard">
        <ProtectedRoute allowedRoles={["technician"]}><TechnicianDashboard /></ProtectedRoute>
      </Route>
      <Route path="/technician/bookings">
        <ProtectedRoute allowedRoles={["technician"]}><TechnicianBookings /></ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute allowedRoles={["customer", "technician"]}><Analytics /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Layout>
                  <Router />
                </Layout>
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

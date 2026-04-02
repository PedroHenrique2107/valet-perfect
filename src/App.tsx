import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "./pages/NotFound";

const Index = lazy(() => import("./pages/Index"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const VehiclesPage = lazy(() => import("./pages/VehiclesPage"));
const AttendantsPage = lazy(() => import("./pages/AttendantsPage"));
const ParkingMapPage = lazy(() => import("./pages/ParkingMapPage"));
const FinancialPage = lazy(() => import("./pages/FinancialPage"));
const CashPage = lazy(() => import("./pages/CashPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando...</div>}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "attendant", "cashier"]}>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "attendant", "cashier"]}>
                    <VehiclesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendants"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "attendant"]}>
                    <AttendantsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/parking-map"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "attendant"]}>
                    <ParkingMapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financial"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "cashier"]}>
                    <FinancialPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cash"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "attendant", "cashier"]}>
                    <CashPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "attendant", "cashier"]}>
                    <ClientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "cashier"]}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "attendant", "cashier"]}>
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "attendant", "cashier"]}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={["admin", "leader", "attendant", "cashier"]}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

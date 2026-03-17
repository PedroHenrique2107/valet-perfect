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
const VehiclesPage = lazy(() => import("./pages/VehiclesPage"));
const AttendantsPage = lazy(() => import("./pages/AttendantsPage"));
const ParkingMapPage = lazy(() => import("./pages/ParkingMapPage"));
const FinancialPage = lazy(() => import("./pages/FinancialPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));

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
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={["admin", "attendant", "cashier"]}>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute allowedRoles={["admin", "attendant", "cashier"]}>
                    <VehiclesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendants"
                element={
                  <ProtectedRoute allowedRoles={["admin", "attendant"]}>
                    <AttendantsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/parking-map"
                element={
                  <ProtectedRoute allowedRoles={["admin", "attendant"]}>
                    <ParkingMapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financial"
                element={
                  <ProtectedRoute allowedRoles={["admin", "cashier"]}>
                    <FinancialPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute allowedRoles={["admin", "attendant", "cashier"]}>
                    <ClientsPage />
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

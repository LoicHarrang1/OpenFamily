import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { AppProvider } from "@/contexts/AppContext";
import { AddButtonProvider } from "@/contexts/AddButtonContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import AppContent from "./components/AppContent";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <ThemeProvider defaultTheme="light" switchable={true}>
              <TooltipProvider>
                <AppProvider>
                  <AddButtonProvider>
                    <Toaster />
                    <Router>
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute requiredRole="admin">
                              <Admin />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/*"
                          element={
                            <ProtectedRoute>
                              <AppContent />
                            </ProtectedRoute>
                          }
                        />
                      </Routes>
                    </Router>
                  </AddButtonProvider>
                </AppProvider>
              </TooltipProvider>
            </ThemeProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

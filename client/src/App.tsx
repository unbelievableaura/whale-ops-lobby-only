import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BackgroundMusic from "./components/BackgroundMusic";
import Loading from "./pages/Loading";
import Home from "./pages/Home";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Loading} />
      <Route path={"/lobby"}>
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider
          defaultTheme="dark"
        >
          <TooltipProvider>
            <Toaster />
            <BackgroundMusic />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

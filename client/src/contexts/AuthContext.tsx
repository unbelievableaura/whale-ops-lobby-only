import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  authenticate: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = "whale_ops_authenticated";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check localStorage on initial load
    return localStorage.getItem(AUTH_KEY) === "true";
  });

  const authenticate = () => {
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_KEY, "true");
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, type User } from "@/api/client";

type UserRole = "patient" | "doctor" | "admin";

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, fullName: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const currentUser = await apiClient.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setUserRole((currentUser.role as UserRole) || null);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.login(email, password);
      if (response.success && response.user) {
        setUser(response.user as unknown as User);
        setUserRole((response.user.role as UserRole) || null);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error logging in:", error);
      return false;
    }
  };

  const signup = async (email: string, password: string, fullName: string): Promise<boolean> => {
    try {
      const response = await apiClient.signup(email, password, fullName);
      if (response.success && response.user) {
        setUser(response.user as unknown as User);
        setUserRole((response.user.role as UserRole) || null);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error signing up:", error);
      return false;
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setUser(null);
      setUserRole(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signOut, login, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

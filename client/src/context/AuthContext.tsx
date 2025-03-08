/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  authService,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  ProfileUpdateData,
} from "../services/authService";

interface AuthContextType {
  user: Omit<AuthResponse, "token"> | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: ProfileUpdateData) => Promise<void>;
  clearError: () => void;
  checkAuthStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Omit<AuthResponse, "token"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const isTokenInitialized = authService.initialize();

        if (isTokenInitialized) {
          console.log("Token found, fetching user profile");
          try {
            // If we have a token, fetch the user profile
            const profile = await authService.getProfile();
            setUser(profile);
            console.log("User authenticated:", profile.name);
          } catch (err) {
            console.error("Invalid or expired token:", err);
            // If profile fetch fails, token is likely invalid or expired
            authService.logout();
          }
        }
      } catch (err) {
        console.error("Failed to initialize auth:", err);
        // If there's an error during initialization, clear the token
        authService.logout();
      } finally {
        setLoading(false);
        setInitialCheckDone(true);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Check if the user is currently authenticated
   * Can be called anywhere to verify auth status
   */
  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      setLoading(true);
      if (!user) {
        // Check if we have a valid token that can be used
        const isValid = await authService.validateToken();
        if (isValid) {
          // If token is valid but we don't have user data, fetch it
          const profile = await authService.getProfile();
          setUser(profile);
          return true;
        }
        return false;
      }
      return true;
    } catch (err) {
      console.error("Auth status check failed:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await authService.login(credentials);
      setUser({
        _id: userData._id,
        name: userData.name,
        email: userData.email,
        department: userData.department,
        isAdmin: userData.isAdmin,
      });
      console.log("Login successful for:", userData.name);
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Failed to login");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(userData);
      setUser({
        _id: response._id,
        name: response.name,
        email: response.email,
        department: response.department,
        isAdmin: response.isAdmin,
      });
      console.log("Registration successful for:", response.name);
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(err.message || "Failed to register");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log("Logging out user");
    authService.logout();
    setUser(null);
  };

  const updateProfile = async (profileData: ProfileUpdateData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedProfile = await authService.updateProfile(profileData);
      setUser(updatedProfile);
      console.log("Profile updated for:", updatedProfile.name);
    } catch (err: any) {
      console.error("Profile update failed:", err);
      setError(err.message || "Failed to update profile");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    checkAuthStatus,
  };

  // Don't render children until initial auth check is done
  if (!initialCheckDone) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

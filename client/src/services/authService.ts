import api from "../services/api";

// Define types
export interface AuthResponse {
  _id: string;
  name: string;
  email: string;
  department: string;
  isAdmin: boolean;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  department: string;
}

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  department?: string;
  currentPassword?: string;
  newPassword?: string;
}

// Token storage functions
const setToken = (token: string) => {
  localStorage.setItem("userToken", token);
  // Update axios header for future requests
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

const removeToken = () => {
  localStorage.removeItem("userToken");
  delete api.defaults.headers.common["Authorization"];
};

// Auth service
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      console.log("Login attempt with:", credentials.email);
      const response = await api.post("/api/auth/login", credentials);
      const data = response.data;
      console.log("Login response:", data);

      if (!data.token) {
        throw new Error("No token received from server");
      }

      // Store token and update axios
      setToken(data.token);

      return data;
    } catch (error: any) {
      console.error("Login error:", error);

      // Provide more detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Response error data:", error.response.data);
        console.error("Response error status:", error.response.status);

        if (error.response.status === 401) {
          throw new Error("Invalid email or password");
        } else if (error.response.data && error.response.data.message) {
          throw new Error(error.response.data.message);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
        throw new Error(
          "No response from server. Please check your connection."
        );
      }

      throw error;
    }
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      console.log("Registration attempt with:", userData.email);
      const response = await api.post("/api/auth/register", userData);
      const data = response.data;
      console.log("Registration response:", data);

      // Store token and update axios
      setToken(data.token);

      return data;
    } catch (error: any) {
      console.error("Registration error:", error);

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        throw new Error(error.response.data.message);
      }

      throw error;
    }
  },

  logout: () => {
    console.log("Logging out user");
    removeToken();
  },

  getProfile: async (): Promise<Omit<AuthResponse, "token">> => {
    try {
      const response = await api.get("/api/auth/profile");
      console.log("Profile data received:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Get profile error:", error);

      if (error.response && error.response.status === 401) {
        // Token expired or invalid, log the user out
        removeToken();
        throw new Error("Session expired. Please login again.");
      }

      throw error;
    }
  },

  updateProfile: async (
    profileData: ProfileUpdateData
  ): Promise<Omit<AuthResponse, "token">> => {
    try {
      const response = await api.put("/api/faculty/profile", profileData);
      return response.data;
    } catch (error: any) {
      console.error("Update profile error:", error);

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        throw new Error(error.response.data.message);
      }

      throw error;
    }
  },

  // Initialize the auth state from localStorage
  initialize: () => {
    const token = localStorage.getItem("userToken");
    if (token) {
      console.log("Found existing token, initializing with it");
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return true;
    }
    console.log("No token found in localStorage");
    return false;
  },

  // Helper function to check if the current token is valid
  validateToken: async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        return false;
      }

      // Try to get profile with current token
      await api.get("/api/auth/profile");
      return true;
    } catch (error) {
      console.error("Token validation failed:", error);
      // Remove invalid token
      removeToken();
      return false;
    }
  },
};

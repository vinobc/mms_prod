import api from "./api";

export interface SystemSetting {
  _id: string;
  key: string;
  value: boolean | string | number;
  description: string;
  updatedBy: string;
  updatedAt: string;
  createdAt: string;
}

export interface ScoreEntryStatus {
  enabled: boolean;
  message: string;
}

export const systemSettingService = {
  // Get all system settings
  getAllSettings: async (): Promise<SystemSetting[]> => {
    try {
      const response = await api.get("/api/settings");
      return response.data;
    } catch (error) {
      console.error("Error fetching system settings:", error);
      throw error;
    }
  },

  // Get a specific setting by key
  getSetting: async (key: string): Promise<SystemSetting> => {
    try {
      const response = await api.get(`/api/settings/${key}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      throw error;
    }
  },

  // Update a system setting
  updateSetting: async (
    key: string,
    value: boolean | string | number
  ): Promise<SystemSetting> => {
    try {
      const response = await api.put(`/api/settings/${key}`, { value });
      return response.data;
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      throw error;
    }
  },

  // Check if score entry is enabled
  isScoreEntryEnabled: async (): Promise<ScoreEntryStatus> => {
    try {
      const response = await api.get("/api/settings/status/scoreEntry");
      return response.data;
    } catch (error) {
      console.error("Error checking score entry status:", error);
      // Default to enabled if there's an error
      return { enabled: true, message: "Score entry is enabled" };
    }
  },

  // Toggle score entry on/off
  toggleScoreEntry: async (enabled: boolean): Promise<SystemSetting> => {
    try {
      return await systemSettingService.updateSetting(
        "scoreEntryEnabled",
        enabled
      );
    } catch (error) {
      console.error("Error toggling score entry:", error);
      throw error;
    }
  },
};

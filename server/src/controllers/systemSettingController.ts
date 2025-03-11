import { Request, Response } from "express";
import SystemSetting from "../models/SystemSetting";
import mongoose from "mongoose";

// Initialize the system with default settings
export const initializeSystemSettings = async (): Promise<void> => {
  try {
    // Check if score entry setting exists
    const scoreEntryEnabled = await SystemSetting.findOne({
      key: "scoreEntryEnabled",
    });

    // If not, create it with default value (enabled)
    if (!scoreEntryEnabled) {
      // Find any admin user to set as the creator
      const adminId = new mongoose.Types.ObjectId();

      await SystemSetting.create({
        key: "scoreEntryEnabled",
        value: true,
        description: "Controls whether faculty can enter or modify scores",
        updatedBy: adminId,
      });

      console.log("Initialized scoreEntryEnabled setting to TRUE");
    }
  } catch (error) {
    console.error("Error initializing system settings:", error);
  }
};

export const systemSettingController = {
  // Get all system settings
  getAllSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await SystemSetting.find();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res
        .status(500)
        .json({ message: "Error fetching system settings", error });
    }
  },

  // Get a specific setting by key
  getSetting: async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const setting = await SystemSetting.findOne({ key });

      if (!setting) {
        res.status(404).json({ message: `Setting "${key}" not found` });
        return;
      }

      res.json(setting);
    } catch (error) {
      console.error(`Error fetching setting ${req.params.key}:`, error);
      res.status(500).json({ message: "Error fetching setting", error });
    }
  },

  // Update a system setting
  updateSetting: async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        res.status(400).json({ message: "Value is required" });
        return;
      }

      // Find and update the setting
      const setting = await SystemSetting.findOneAndUpdate(
        { key },
        {
          value,
          updatedBy: req.user?.id,
        },
        { new: true, upsert: true }
      );

      res.json(setting);
    } catch (error) {
      console.error(`Error updating setting ${req.params.key}:`, error);
      res.status(500).json({ message: "Error updating setting", error });
    }
  },

  // Convenient method to check if score entry is enabled
  isScoreEntryEnabled: async (req: Request, res: Response): Promise<void> => {
    try {
      const setting = await SystemSetting.findOne({ key: "scoreEntryEnabled" });
      res.json({
        enabled: setting ? setting.value : true,
        message: setting?.value
          ? "Score entry is enabled"
          : "Score entry has been disabled by administrator",
      });
    } catch (error) {
      console.error("Error checking if score entry is enabled:", error);
      res
        .status(500)
        .json({ message: "Error checking score entry status", error });
    }
  },
};

// Helper function to check if score entry is enabled
export const checkScoreEntryEnabled = async (): Promise<boolean> => {
  try {
    const setting = await SystemSetting.findOne({ key: "scoreEntryEnabled" });
    // Default to true if setting doesn't exist
    return setting ? !!setting.value : true;
  } catch (error) {
    console.error("Error checking score entry status:", error);
    // Default to true if there's an error
    return true;
  }
};

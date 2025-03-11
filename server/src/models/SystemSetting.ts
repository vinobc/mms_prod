import mongoose, { Schema, Document } from "mongoose";

export interface ISystemSetting extends Document {
  key: string;
  value: boolean | string | number;
  description: string;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const SystemSettingSchema: Schema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      required: false,
      default: "",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISystemSetting>(
  "SystemSetting",
  SystemSettingSchema
);

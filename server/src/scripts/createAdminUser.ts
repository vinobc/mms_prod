import mongoose from "mongoose";
import dotenv from "dotenv";
import Faculty from "../models/Faculty";
import readline from "readline";

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt for input
const promptQuestion = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Main function to create admin
const createAdmin = async () => {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB successfully!");

    // Check if admin already exists
    const existingAdmin = await Faculty.findOne({ isAdmin: true });
    if (existingAdmin) {
      console.log("\nAn admin user already exists:");
      console.log(`Name: ${existingAdmin.name}`);
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Department: ${existingAdmin.department}`);

      const proceed = await promptQuestion(
        "\nDo you want to create another admin user? (yes/no): "
      );
      if (proceed.toLowerCase() !== "yes") {
        console.log("Operation cancelled.");
        rl.close();
        return;
      }
    }

    // Get admin information
    console.log("\nPlease provide information for the new admin user:");
    const name = await promptQuestion("Full Name: ");
    const email = await promptQuestion("Email: ");
    const department = await promptQuestion("Department: ");
    const password = await promptQuestion("Password (min 6 characters): ");

    if (password.length < 6) {
      console.log("Password must be at least 6 characters long.");
      rl.close();
      return;
    }

    // Create admin user
    const admin = new Faculty({
      name,
      email,
      department,
      password,
      isAdmin: true,
      courseIds: [],
    });

    await admin.save();

    console.log("\nAdmin user created successfully!");
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Department: ${department}`);
    console.log("\nYou can now login with these credentials.");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    // Close readline interface and database connection
    rl.close();
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
};

// Run the function
createAdmin();

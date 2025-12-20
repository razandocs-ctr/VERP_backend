import mongoose from "mongoose";
import Group from "../models/Group.js";
import { getAllPermissions } from "../services/permissionService.js";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected Successfully");
        
        // Initialize default Admin group
        await initializeAdminGroup();
    } catch (error) {
        console.error("❌ Database Connection Failed:", error.message);
        process.exit(1);
    }
};

/**
 * Initialize the default Admin group if it doesn't exist
 * This group has all permissions and cannot be deleted or modified (except by admin users)
 */
const initializeAdminGroup = async () => {
    try {
        // Check if Admin group already exists
        const existingAdminGroup = await Group.findOne({
            name: { $regex: new RegExp('^Admin$', 'i') }
        });

        if (!existingAdminGroup) {
            // Get all permissions for Admin group
            const allPermissions = getAllPermissions();

            // Create Admin group with all permissions
            const adminGroup = new Group({
                name: 'Admin',
                users: [],
                permissions: allPermissions,
                status: 'Active',
                isSystemGroup: true
            });

            await adminGroup.save();
            console.log("✅ Default Admin group created successfully");
        } else {
            // If Admin group exists but is not marked as system group, update it
            if (!existingAdminGroup.isSystemGroup) {
                existingAdminGroup.isSystemGroup = true;
                // Also ensure it has all permissions
                const allPermissions = getAllPermissions();
                existingAdminGroup.permissions = allPermissions;
                await existingAdminGroup.save();
                console.log("✅ Existing Admin group updated to system group");
            }
        }
    } catch (error) {
        console.error("❌ Error initializing Admin group:", error.message);
        // Don't exit - this is not critical for server startup
    }
};

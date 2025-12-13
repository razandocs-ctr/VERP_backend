import { getUserPermissions } from "../../services/permissionService.js";

// Get user permissions for the authenticated user
export const getUserPermissionsController = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const permissions = await getUserPermissions(userId);

        if (!permissions) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Permissions fetched successfully",
            permissions
        });
    } catch (error) {
        console.error('Error getting user permissions:', error);
        return res.status(500).json({
            message: error.message || "Internal server error"
        });
    }
};

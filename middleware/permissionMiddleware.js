/**
 * Middleware to check if user has permission for a specific module and action
 * @param {string} moduleId - The module ID to check (e.g., 'hrm_employees', 'settings_user_group')
 * @param {string} permissionType - The permission type to check ('create', 'view', 'edit', 'delete', 'full')
 * @returns {Function} Express middleware function
 */
export const checkPermission = (moduleId, permissionType = 'view') => {
    return async (req, res, next) => {
        try {
            // Get user ID from token (set by authMiddleware)
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: "Not authorized, no user found" });
            }

            // Import here to avoid circular dependency
            const { hasPermission, isUserAdministrator } = await import("../services/permissionService.js");

            // First check if user is admin - admins bypass all permission checks
            const isAdmin = await isUserAdministrator(userId);
            if (isAdmin) {
                // Admin has all permissions, proceed
                return next();
            }

            // Check if user has the required permission
            const hasAccess = await hasPermission(userId, moduleId, permissionType);

            if (!hasAccess) {
                return res.status(403).json({
                    message: `Access denied. You don't have ${permissionType} permission for ${moduleId}`
                });
            }

            // User has permission, proceed
            next();
        } catch (error) {
            console.error('Error checking permission:', error);
            return res.status(500).json({ message: "Error checking permissions" });
        }
    };
};

/**
 * Middleware to check if user is admin
 * @returns {Function} Express middleware function
 */
export const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Not authorized, no user found" });
        }

        // Import here to avoid circular dependency
        const { isUserAdministrator } = await import("../services/permissionService.js");
        const isAdmin = await isUserAdministrator(userId);

        if (!isAdmin) {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }

        next();
    } catch (error) {
        console.error('Error checking admin status:', error);
        return res.status(500).json({ message: "Error checking admin status" });
    }
};


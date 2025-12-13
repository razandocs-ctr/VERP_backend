import User from "../models/User.js";
import EmployeeBasic from "../models/EmployeeBasic.js";
import Group from "../models/Group.js";

/**
 * Get user permissions
 * - Administrator users get all permissions automatically
 * - Users without a group get no permissions (unless Administrator)
 * - Users with a group get permissions from that group
 */
export const getUserPermissions = async (userId) => {
    try {
        const user = await User.findById(userId)
            .populate('group', 'permissions')
            .lean();

        if (!user) {
            return null;
        }

        // Check if user is Admin - ONLY check isAdmin field, not employee designation/department
        // The isAdmin field should be set when creating the user based on employee designation/department
        const isAdministrator = user.isAdmin === true;

        // Admin gets all permissions automatically
        if (isAdministrator) {
            return {
                isAdministrator: true,
                isAdmin: true,
                permissions: getAllPermissions(),
                group: null,
                groupName: null
            };
        }

        // User without a group gets NO permissions (unless admin)
        if (!user.group) {
            return {
                isAdministrator: false,
                isAdmin: false,
                permissions: {},
                group: null,
                groupName: null
            };
        }

        // User with a group gets group permissions
        const group = await Group.findById(user.group).lean();
        if (!group) {
            return {
                isAdministrator: false,
                permissions: {},
                group: null,
                groupName: null
            };
        }

        // Convert permissions from old format to new format if needed
        const rawPermissions = group.permissions || {};
        const convertedPermissions = convertPermissionsFormat(rawPermissions);

        return {
            isAdministrator: false,
            isAdmin: false,
            permissions: convertedPermissions,
            group: user.group,
            groupName: user.groupName || group.name
        };
    } catch (error) {
        console.error('Error getting user permissions:', error);
        return null;
    }
};

/**
 * Convert permissions from old format (full, create, view, edit, delete) to new format (isActive, isCreate, isEdit, isDelete)
 */
const convertPermissionsFormat = (permissions) => {
    const converted = {};

    Object.keys(permissions).forEach(moduleId => {
        const oldPerm = permissions[moduleId];

        // Check if already in new format
        if (oldPerm && oldPerm.hasOwnProperty('isActive')) {
            converted[moduleId] = {
                isActive: oldPerm.isActive ?? false,
                isCreate: oldPerm.isCreate ?? false,
                isEdit: oldPerm.isEdit ?? false,
                isDelete: oldPerm.isDelete ?? false
            };
        } else if (oldPerm) {
            // Convert from old format
            converted[moduleId] = {
                isActive: oldPerm.full || oldPerm.view || false,
                isCreate: oldPerm.full || oldPerm.create || false,
                isEdit: oldPerm.full || oldPerm.edit || false,
                isDelete: oldPerm.full || oldPerm.delete || false
            };
        }
    });

    // Ensure dashboard is always active
    if (!converted.dashboard) {
        converted.dashboard = {
            isActive: true,
            isCreate: false,
            isEdit: false,
            isDelete: false
        };
    } else {
        converted.dashboard.isActive = true;
    }

    return converted;
};

/**
 * Check if user has permission for a specific module and action
 */
export const hasPermission = async (userId, moduleId, permissionType) => {
    const userPermissions = await getUserPermissions(userId);

    if (!userPermissions) {
        return false;
    }

    // Administrator has all permissions
    if (userPermissions.isAdministrator) {
        return true;
    }

    // Dashboard and logout are always accessible
    if (moduleId === 'dashboard' || moduleId === 'logout') {
        return true;
    }

    // Check if module permission exists
    const modulePermission = userPermissions.permissions[moduleId];
    if (!modulePermission) {
        return false;
    }

    // First check if module is active (isActive must be true)
    if (!modulePermission.isActive) {
        return false;
    }

    // For isActive check, just return the isActive value
    if (permissionType === 'isActive' || permissionType === 'view') {
        return modulePermission.isActive === true;
    }

    // Map old permission types to new ones for backward compatibility
    const permissionMap = {
        'create': 'isCreate',
        'edit': 'isEdit',
        'delete': 'isDelete',
        'view': 'isActive',
        'full': 'isActive' // Full permission means isActive = true
    };

    const newPermissionType = permissionMap[permissionType] || permissionType;

    // Check specific permission type
    return modulePermission[newPermissionType] === true;
};

/**
 * MODULES structure matching the frontend
 * This defines all available modules/sessions with their hierarchical structure
 */
const MODULES_STRUCTURE = [
    { id: 'login', label: 'Login', parent: null },
    { id: 'dashboard', label: 'Dashboard', parent: null },
    {
        id: 'hrm',
        label: 'HRM',
        parent: null,
        children: [
            {
                id: 'hrm_employees',
                label: 'Employees',
                parent: 'hrm',
                children: [
                    { id: 'hrm_employees_add', label: 'Add Employee', parent: 'hrm_employees' },
                    { id: 'hrm_employees_list', label: 'Employee List', parent: 'hrm_employees' },
                    {
                        id: 'hrm_employees_view',
                        label: 'View Employee',
                        parent: 'hrm_employees',
                        children: [
                            { id: 'hrm_employees_view_basic', label: 'Basic Details', parent: 'hrm_employees_view' },
                            { id: 'hrm_employees_view_personal', label: 'Personal Details', parent: 'hrm_employees_view' },
                            { id: 'hrm_employees_view_passport', label: 'Passport', parent: 'hrm_employees_view' },
                            { id: 'hrm_employees_view_visa', label: 'Visa', parent: 'hrm_employees_view' },
                            { id: 'hrm_employees_view_education', label: 'Education', parent: 'hrm_employees_view' },
                            { id: 'hrm_employees_view_experience', label: 'Experience', parent: 'hrm_employees_view' },
                            { id: 'hrm_employees_view_work', label: 'Work Details', parent: 'hrm_employees_view' },
                            { id: 'hrm_employees_view_salary', label: 'Salary', parent: 'hrm_employees_view' },
                            { id: 'hrm_employees_view_bank', label: 'Bank Details', parent: 'hrm_employees_view' },
                            { id: 'hrm_employees_view_emergency', label: 'Emergency Contacts', parent: 'hrm_employees_view' },
                        ]
                    }
                ]
            },
            { id: 'hrm_attendance', label: 'Attendance', parent: 'hrm' },
            { id: 'hrm_leave', label: 'Leave', parent: 'hrm' },
            { id: 'hrm_ncr', label: 'NCR', parent: 'hrm' },
        ]
    },
    { id: 'crm', label: 'CRM', parent: null },
    { id: 'purchases', label: 'Purchases', parent: null },
    { id: 'accounts', label: 'Accounts', parent: null },
    { id: 'production', label: 'Production', parent: null },
    { id: 'reports', label: 'Reports', parent: null },
    {
        id: 'settings',
        label: 'Settings',
        parent: null,
        children: [
            { id: 'settings_user_group', label: 'Create User & Group', parent: 'settings' }
        ]
    },
];

/**
 * Recursively extract all module IDs from the MODULES structure
 */
const getAllModuleIds = (modules) => {
    const moduleIds = [];

    modules.forEach(module => {
        moduleIds.push(module.id);
        if (module.children && module.children.length > 0) {
            moduleIds.push(...getAllModuleIds(module.children));
        }
    });

    return moduleIds;
};

/**
 * Get all possible permissions (for Administrator)
 * Returns permissions for all modules/sessions with all permission types enabled
 */
const getAllPermissions = () => {
    // Get all module IDs from the hierarchical structure
    const allModuleIds = getAllModuleIds(MODULES_STRUCTURE);

    const permissions = {};

    // Set all permissions to true for each module/session
    allModuleIds.forEach(moduleId => {
        permissions[moduleId] = {
            isActive: true,
            isCreate: true,
            isEdit: true,
            isDelete: true
        };
    });

    // Dashboard is always active (but not necessarily create/edit/delete)
    permissions.dashboard = {
        isActive: true,
        isCreate: false,
        isEdit: false,
        isDelete: false
    };

    return permissions;
};

/**
 * Check if user is Administrator
 * Only checks the isAdmin field in the User model
 */
export const isUserAdministrator = async (userId) => {
    try {
        const user = await User.findById(userId)
            .select('isAdmin')
            .lean();

        if (!user) {
            return false;
        }

        // Only check isAdmin field - this should be set when user is created
        return user.isAdmin === true;
    } catch (error) {
        console.error('Error checking if user is administrator:', error);
        return false;
    }
};


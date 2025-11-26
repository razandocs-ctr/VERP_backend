// import Employee from "../../models/Employee.js";

// const ALLOWED_FIELDS = [
//     "employeeId",
//     "contactNumber",
//     "personalEmail",
//     "workEmail",
//     "nationality",
//     "country"
// ];

// export const updateBasicDetails = async (req, res) => {
//     try {
//         console.log("=== updateBasicDetails Controller Called ===");
//         console.log("Request params:", req.params);
//         console.log("Request body:", req.body);

//         const { id } = req.params;
//         const updatePayload = {};

//         ALLOWED_FIELDS.forEach((field) => {
//             if (req.body[field] !== undefined) {
//                 updatePayload[field] = req.body[field];
//             }
//         });

//         console.log("Filtered updatePayload:", updatePayload);

//         if (Object.keys(updatePayload).length === 0) {
//             console.log("ERROR: No valid fields in updatePayload");
//             return res.status(400).json({
//                 message: "No valid fields provided to update."
//             });
//         }

//         const updatedEmployee = await Employee.findByIdAndUpdate(
//             id,
//             { $set: updatePayload },
//             { new: true, runValidators: true }
//         ).select("-password");

//         console.log("Updated employee:", updatedEmployee);

//         if (!updatedEmployee) {
//             console.log("ERROR: Employee not found with id:", id);
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         console.log("=== Update Successful ===");
//         return res.status(200).json({
//             message: "Basic details updated successfully",
//             employee: updatedEmployee
//         });
//     } catch (error) {
//         console.error("ERROR in updateBasicDetails:", error);
//         return res.status(500).json({ message: error.message });
//     }
// };


// // controllers/employeeController.js
export const updateBasicDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Define allowed fields
        const allowedFields = [
            "employeeId",
            "contactNumber",
            "email",
            "country",
            "status"
        ];

        // 2. Build updatePayload
        const updatePayload = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updatePayload[field] = req.body[field];
            }
        });

        // 3. If nothing to update
        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ message: "Nothing to update" });
        }

        // 4. Update DB
        const updated = await Employee.findByIdAndUpdate(
            id,
            { $set: updatePayload },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updated) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // 5. Return success
        return res.status(200).json({
            message: "Basic details updated",
            employee: updated
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};

// import Employee from "../../models/Employee.js";

// export const updateBasicDetails = async (req, res) => {
//     try {
//         console.log("=== updateBasicDetails Controller Called ===");
//         console.log("Request params:", req.params);
//         console.log("Request body:", req.body);

//         const { id } = req.params;

//         // Allowed fields from frontend
//         const allowedUpdates = [
//             "employeeId",
//             "contactNumber",
//             "personalEmail",
//             "workEmail",
//             "nationality",
//             "country",
//             "status"
//         ];

//         const updatePayload = {};
//         allowedUpdates.forEach(field => {
//             if (req.body[field] !== undefined) {
//                 updatePayload[field] = req.body[field];
//             }
//         });

//         console.log("Filtered updatePayload:", updatePayload);

//         if (Object.keys(updatePayload).length === 0) {
//             console.log("ERROR: No valid fields in updatePayload");
//             return res.status(400).json({
//                 message: "No valid fields provided to update."
//             });
//         }

//         const updatedEmployee = await Employee.findByIdAndUpdate(
//             id,
//             { $set: updatePayload },
//             { new: true, runValidators: true }
//         ).select("-password");

//         console.log("Updated employee:", updatedEmployee);

//         if (!updatedEmployee) {
//             console.log("ERROR: Employee not found with id:", id);
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         console.log("=== Update Successful ===");
//         return res.status(200).json({
//             message: "Basic details updated successfully",
//             employee: updatedEmployee
//         });
//     } catch (error) {
//         console.error("ERROR in updateBasicDetails:", error);
//         return res.status(500).json({
//             message: "Failed to update employee basic details",
//             error: error.message
//         });
//     }
// };

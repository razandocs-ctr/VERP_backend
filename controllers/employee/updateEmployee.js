// import Employee from "../../models/Employee.js";
// import bcrypt from "bcryptjs";

// // Calculate age from date of birth
// const calculateAge = (dateOfBirth) => {
//     if (!dateOfBirth) return null;
//     const birthDate = new Date(dateOfBirth);
//     const today = new Date();
//     let age = today.getFullYear() - birthDate.getFullYear();
//     const monthDiff = today.getMonth() - birthDate.getMonth();
//     if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
//         age--;
//     }
//     return age;
// };

// // Update employee
// export const updateEmployee = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const updateData = { ...req.body };

//         // If dateOfBirth is being updated, recalculate age
//         if (updateData.dateOfBirth) {
//             updateData.age = calculateAge(updateData.dateOfBirth);
//         }

//         // If password is being updated, hash it
//         if (updateData.password) {
//             updateData.password = await bcrypt.hash(updateData.password, 10);
//         }

//         const updatedEmployee = await Employee.findByIdAndUpdate(
//             id,
//             { $set: updateData },
//             { new: true, runValidators: true }
//         ).select('-password');

//         if (!updatedEmployee) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         return res.status(200).json({
//             message: "Employee updated successfully",
//             employee: updatedEmployee,
//         });
//     } catch (error) {
//         return res.status(500).json({ message: error.message });
//     }
// };




import mongoose from "mongoose";
import EmployeeBasic from "../models/EmployeeBasic.js";
import EmployeeContact from "../models/EmployeeContact.js";
import EmployeePersonal from "../models/EmployeePersonal.js";
import EmployeePassport from "../models/EmployeePassport.js";
import EmployeeVisa from "../models/EmployeeVisa.js";
import EmployeeEmiratesId from "../models/EmployeeEmiratesId.js";
import EmployeeLabourCard from "../models/EmployeeLabourCard.js";
import EmployeeMedicalInsurance from "../models/EmployeeMedicalInsurance.js";
import EmployeeDrivingLicense from "../models/EmployeeDrivingLicense.js";
import EmployeeSalary from "../models/EmployeeSalary.js";
import EmployeeBank from "../models/EmployeeBank.js";
import EmployeeEducation from "../models/EmployeeEducation.js";
import EmployeeExperience from "../models/EmployeeExperience.js";
import EmployeeEmergencyContact from "../models/EmployeeEmergencyContact.js";
import EmployeeTraining from "../models/EmployeeTraining.js";

/**
 * Get complete employee data by ID (can be _id or employeeId)
 * @param {string|ObjectId} id - Employee _id or employeeId
 * @returns {Promise<Object|null>} Complete employee object or null if not found
 */
export const getCompleteEmployee = async (id) => {
    try {
        // Determine if id is ObjectId or employeeId
        let employeeBasic;
        if (mongoose.Types.ObjectId.isValid(id) && id.toString().length === 24) {
            // It's an ObjectId
            employeeBasic = await EmployeeBasic.findById(id)
                .populate('reportingAuthority', 'firstName lastName employeeId')
                .populate('primaryReportee', 'firstName lastName employeeId')
                .populate('secondaryReportee', 'firstName lastName employeeId')
                .lean();
        } else {
            // It's an employeeId (string)
            employeeBasic = await EmployeeBasic.findOne({ employeeId: id })
                .populate('reportingAuthority', 'firstName lastName employeeId')
                .populate('primaryReportee', 'firstName lastName employeeId')
                .populate('secondaryReportee', 'firstName lastName employeeId')
                .lean();
        }

        if (!employeeBasic) {
            return null;
        }

        const employeeId = employeeBasic.employeeId;

        // Fetch all related data in parallel
        const [
            contact,
            personal,
            passport,
            visa,
            emiratesId,
            labourCard,
            medicalInsurance,
            drivingLicense,
            salary,
            bank,
            education,
            experience,
            emergencyContact,
            training
        ] = await Promise.all([
            EmployeeContact.findOne({ employeeId }).lean(),
            EmployeePersonal.findOne({ employeeId }).lean(),
            EmployeePassport.findOne({ employeeId }).lean(),
            EmployeeVisa.findOne({ employeeId }).lean(),
            EmployeeEmiratesId.findOne({ employeeId }).lean(),
            EmployeeLabourCard.findOne({ employeeId }).lean(),
            EmployeeMedicalInsurance.findOne({ employeeId }).lean(),
            EmployeeDrivingLicense.findOne({ employeeId }).lean(),
            EmployeeSalary.findOne({ employeeId }).lean(),
            EmployeeBank.findOne({ employeeId }).lean(),
            EmployeeEducation.findOne({ employeeId }).lean(),
            EmployeeExperience.findOne({ employeeId }).lean(),
            EmployeeEmergencyContact.findOne({ employeeId }).lean(),
            EmployeeTraining.findOne({ employeeId }).lean(),
        ]);

        // Combine all data into a single object
        const completeEmployee = {
            ...employeeBasic,
            // Contact information
            ...(contact && {
                contactNumber: contact.contactNumber,
                addressLine1: contact.addressLine1,
                addressLine2: contact.addressLine2,
                country: contact.country,
                state: contact.state,
                city: contact.city,
                postalCode: contact.postalCode,
                currentAddressLine1: contact.currentAddressLine1,
                currentAddressLine2: contact.currentAddressLine2,
                currentCity: contact.currentCity,
                currentState: contact.currentState,
                currentCountry: contact.currentCountry,
                currentPostalCode: contact.currentPostalCode,
            }),
            // Personal details
            ...(personal && {
                gender: personal.gender,
                dateOfBirth: personal.dateOfBirth,
                age: personal.age,
                maritalStatus: personal.maritalStatus,
                numberOfDependents: personal.numberOfDependents,
                nationality: personal.nationality,
                fathersName: personal.fathersName,
            }),
            // Passport details
            ...(passport && {
                passportDetails: {
                    number: passport.number,
                    nationality: passport.nationality,
                    issueDate: passport.issueDate,
                    expiryDate: passport.expiryDate,
                    placeOfIssue: passport.placeOfIssue,
                    document: passport.document,
                    lastUpdated: passport.lastUpdated,
                },
                passportExp: passport.passportExp,
                eidExp: passport.eidExp,
                medExp: passport.medExp,
            }),
            // Visa details
            ...(visa && {
                visaDetails: {
                    visit: visa.visit,
                    employment: visa.employment,
                    spouse: visa.spouse,
                },
            }),
            // Emirates ID details
            ...(emiratesId && {
                emiratesIdDetails: emiratesId.emiratesId,
            }),
            // Labour Card details
            ...(labourCard && {
                labourCardDetails: labourCard.labourCard,
            }),
            // Medical Insurance details
            ...(medicalInsurance && {
                medicalInsuranceDetails: medicalInsurance.medicalInsurance,
            }),
            // Driving License details
            ...(drivingLicense && {
                drivingLicenceDetails: drivingLicense.drivingLicenceDetails,
            }),
            // Salary details
            ...(salary && {
                monthlySalary: salary.monthlySalary,
                totalSalary: salary.totalSalary || salary.monthlySalary, // Use totalSalary from DB, fallback to monthlySalary
                basic: salary.basic,
                basicPercentage: salary.basicPercentage,
                houseRentAllowance: salary.houseRentAllowance,
                houseRentPercentage: salary.houseRentPercentage,
                otherAllowance: salary.otherAllowance,
                otherAllowancePercentage: salary.otherAllowancePercentage,
                additionalAllowances: salary.additionalAllowances || [],
                salaryHistory: salary.salaryHistory || [],
                offerLetter: salary.offerLetter,
            }),
            // Bank details
            ...(bank && {
                bankName: bank.bankName,
                accountName: bank.accountName,
                accountNumber: bank.accountNumber,
                ibanNumber: bank.ibanNumber,
                swiftCode: bank.swiftCode,
                bankOtherDetails: bank.bankOtherDetails,
                bankAttachment: bank.bankAttachment,
            }),
            // Education details
            ...(education && {
                educationDetails: education.educationDetails || [],
            }),
            // Experience details
            ...(experience && {
                experienceDetails: experience.experienceDetails || [],
            }),
            // Emergency contact details
            ...(emergencyContact && {
                emergencyContacts: emergencyContact.emergencyContacts || [],
                emergencyContactName: emergencyContact.emergencyContactName,
                emergencyContactRelation: emergencyContact.emergencyContactRelation,
                emergencyContactNumber: emergencyContact.emergencyContactNumber,
            }),
            // Training details
            ...(training && {
                trainingDetails: training.trainingDetails || [],
            }),
        };

        return completeEmployee;
    } catch (error) {
        console.error('Error in getCompleteEmployee:', error);
        throw error;
    }
};

/**
 * Save/update employee data across multiple collections
 * @param {string} employeeId - Employee ID
 * @param {Object} updatePayload - Fields to update
 * @returns {Promise<Object|null>} Updated complete employee object or null if not found
 */
export const saveEmployeeData = async (employeeId, updatePayload) => {
    try {
        // Check if employee exists
        const employee = await EmployeeBasic.findOne({ employeeId });
        if (!employee) {
            return null;
        }

        // Define field mappings to collections
        const basicFields = [
            'employeeId', 'firstName', 'lastName', 'role', 'department', 'designation',
            'status', 'probationPeriod', 'reportingAuthority', 'overtime',
            'profileApprovalStatus', 'profileStatus', 'email', 'password',
            'enablePortalAccess', 'dateOfJoining', 'profilePicture', 'documents', 'trainingDetails'
        ];

        const contactFields = [
            'contactNumber', 'addressLine1', 'addressLine2', 'country', 'state',
            'city', 'postalCode', 'currentAddressLine1', 'currentAddressLine2',
            'currentCity', 'currentState', 'currentCountry', 'currentPostalCode'
        ];

        const personalFields = [
            'gender', 'dateOfBirth', 'age', 'maritalStatus', 'numberOfDependents', 'nationality', 'fathersName'
        ];

        const passportFields = [
            'passportExp', 'eidExp', 'medExp'
        ];

        const salaryFields = [
            'monthlySalary', 'basic', 'basicPercentage', 'houseRentAllowance',
            'houseRentPercentage', 'otherAllowance', 'otherAllowancePercentage',
            'additionalAllowances', 'salaryHistory', 'offerLetter'
        ];

        const bankFields = [
            'bankName', 'accountName', 'accountNumber', 'ibanNumber',
            'swiftCode', 'bankOtherDetails', 'bankAttachment'
        ];

        // Separate fields by collection
        const basicUpdate = {};
        const contactUpdate = {};
        const personalUpdate = {};
        const passportUpdate = {};
        const salaryUpdate = {};
        const bankUpdate = {};

        Object.keys(updatePayload).forEach(field => {
            if (basicFields.includes(field)) {
                basicUpdate[field] = updatePayload[field];
            } else if (contactFields.includes(field)) {
                contactUpdate[field] = updatePayload[field];
            } else if (personalFields.includes(field)) {
                personalUpdate[field] = updatePayload[field];
            } else if (passportFields.includes(field)) {
                passportUpdate[field] = updatePayload[field];
            } else if (salaryFields.includes(field)) {
                salaryUpdate[field] = updatePayload[field];
            } else if (bankFields.includes(field)) {
                bankUpdate[field] = updatePayload[field];
            }
        });

        // Update collections in parallel
        const updatePromises = [];

        if (Object.keys(basicUpdate).length > 0) {
            updatePromises.push(
                EmployeeBasic.findOneAndUpdate(
                    { employeeId },
                    { $set: basicUpdate },
                    { new: true }
                )
            );
        }

        if (Object.keys(contactUpdate).length > 0) {
            updatePromises.push(
                EmployeeContact.findOneAndUpdate(
                    { employeeId },
                    { $set: contactUpdate },
                    { upsert: true, new: true }
                )
            );
        }

        if (Object.keys(personalUpdate).length > 0) {
            updatePromises.push(
                EmployeePersonal.findOneAndUpdate(
                    { employeeId },
                    { $set: personalUpdate },
                    { upsert: true, new: true }
                )
            );
        }

        if (Object.keys(passportUpdate).length > 0) {
            updatePromises.push(
                EmployeePassport.findOneAndUpdate(
                    { employeeId },
                    { $set: passportUpdate },
                    { upsert: true, new: true }
                )
            );
        }

        if (Object.keys(salaryUpdate).length > 0) {
            // Calculate total salary if salary fields are being updated
            if (salaryUpdate.salaryHistory && Array.isArray(salaryUpdate.salaryHistory)) {
                // Calculate total salary for each history entry
                salaryUpdate.salaryHistory = salaryUpdate.salaryHistory.map(entry => {
                    const basic = parseFloat(entry.basic) || 0;
                    const houseRentAllowance = parseFloat(entry.houseRentAllowance) || 0;
                    const otherAllowance = parseFloat(entry.otherAllowance) || 0;
                    const vehicleAllowance = parseFloat(entry.vehicleAllowance) || 0;
                    const fuelAllowance = parseFloat(entry.fuelAllowance) || 0;
                    // Calculate additional allowances excluding vehicle and fuel (already counted separately)
                    const additionalAllowances = Array.isArray(entry.additionalAllowances) 
                        ? entry.additionalAllowances
                            .filter(item => !item.type?.toLowerCase().includes('vehicle') && !item.type?.toLowerCase().includes('fuel'))
                            .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                        : 0;
                    
                    const totalSalary = basic + houseRentAllowance + otherAllowance + vehicleAllowance + fuelAllowance + additionalAllowances;
                    
                    return {
                        ...entry,
                        totalSalary: totalSalary,
                        // Include all allowances in the entry
                        houseRentAllowance: houseRentAllowance,
                        vehicleAllowance: vehicleAllowance,
                        fuelAllowance: fuelAllowance,
                        additionalAllowances: entry.additionalAllowances || []
                    };
                });
            }
            
            // Also calculate total for current salary if basic/otherAllowance/houseRentAllowance are being updated
            if (salaryUpdate.basic !== undefined || salaryUpdate.otherAllowance !== undefined || 
                salaryUpdate.houseRentAllowance !== undefined || salaryUpdate.additionalAllowances !== undefined) {
                // Get current salary record to calculate total
                const currentSalary = await EmployeeSalary.findOne({ employeeId }).lean();
                const basic = parseFloat(salaryUpdate.basic !== undefined ? salaryUpdate.basic : (currentSalary?.basic || 0)) || 0;
                const houseRentAllowance = parseFloat(salaryUpdate.houseRentAllowance !== undefined ? salaryUpdate.houseRentAllowance : (currentSalary?.houseRentAllowance || 0)) || 0;
                const otherAllowance = parseFloat(salaryUpdate.otherAllowance !== undefined ? salaryUpdate.otherAllowance : (currentSalary?.otherAllowance || 0)) || 0;
                const additionalAllowances = salaryUpdate.additionalAllowances || currentSalary?.additionalAllowances || [];
                const additionalTotal = Array.isArray(additionalAllowances) 
                    ? additionalAllowances.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                    : 0;
                
                const calculatedTotal = basic + houseRentAllowance + otherAllowance + additionalTotal;
                salaryUpdate.monthlySalary = calculatedTotal;
                salaryUpdate.totalSalary = calculatedTotal; // Store totalSalary in DB
            }
            
            updatePromises.push(
                EmployeeSalary.findOneAndUpdate(
                    { employeeId },
                    { $set: salaryUpdate },
                    { upsert: true, new: true }
                )
            );
        }

        if (Object.keys(bankUpdate).length > 0) {
            updatePromises.push(
                EmployeeBank.findOneAndUpdate(
                    { employeeId },
                    { $set: bankUpdate },
                    { upsert: true, new: true }
                )
            );
        }

        await Promise.all(updatePromises);

        // Return complete updated employee
        return await getCompleteEmployee(employeeId);
    } catch (error) {
        console.error('Error in saveEmployeeData:', error);
        throw error;
    }
};

/**
 * Delete employee data from all collections
 * @param {string} employeeId - Employee ID
 * @returns {Promise<void>}
 */
export const deleteEmployeeData = async (employeeId) => {
    try {
        // Delete from all collections in parallel
        await Promise.all([
            EmployeeBasic.findOneAndDelete({ employeeId }),
            EmployeeContact.findOneAndDelete({ employeeId }),
            EmployeePersonal.findOneAndDelete({ employeeId }),
            EmployeePassport.findOneAndDelete({ employeeId }),
            EmployeeVisa.findOneAndDelete({ employeeId }),
            EmployeeEmiratesId.findOneAndDelete({ employeeId }),
            EmployeeSalary.findOneAndDelete({ employeeId }),
            EmployeeBank.findOneAndDelete({ employeeId }),
            EmployeeEducation.findOneAndDelete({ employeeId }),
            EmployeeExperience.findOneAndDelete({ employeeId }),
            EmployeeEmergencyContact.findOneAndDelete({ employeeId }),
            EmployeeTraining.findOneAndDelete({ employeeId }),
        ]);
    } catch (error) {
        console.error('Error in deleteEmployeeData:', error);
        throw error;
    }
};




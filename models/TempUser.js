import mongoose from "mongoose";

const tempUserSchema = new mongoose.Schema(
    {
        email: { type: String, required: true },
        token: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model("TempUser", tempUserSchema);

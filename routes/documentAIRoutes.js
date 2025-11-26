// import express from "express";
// import multer from "multer";
// import { parsePassport } from "../controllers/documentAI/parsePassport.js";

// const router = express.Router();
// const upload = multer({
//     storage: multer.memoryStorage(),
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
// });

// router.post("/parse-passport", upload.single("file"), parsePassport);


// export default router;

// routes/documentAI.js
import express from "express";
import multer from "multer";
import { parsePassport } from "../controllers/documentAI/parsePassport.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post("/parse-passport", upload.single("file"), parsePassport);

export default router;



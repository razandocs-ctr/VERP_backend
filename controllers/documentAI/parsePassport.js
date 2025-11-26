import axios from "axios";
import { log } from "console";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";
const SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
];
const MIN_TEXT_LENGTH_FOR_PARSER = 60;

// --- Helper Function: Date Formatting ---
const formatDate = (dateStr = "") => {
    const normalized = dateStr.trim();
    const match = normalized.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);

    if (!match) {
        if (normalized.length === 6 && !Number.isNaN(Number(normalized))) {
            const year = normalized.substring(0, 2);
            const month = normalized.substring(2, 4);
            const day = normalized.substring(4, 6);
            return formatDate(`${day}/${month}/${year}`);
        }
        return "";
    }

    let day = match[1].padStart(2, "0");
    let month = match[2].padStart(2, "0");
    let year = match[3];

    if (year.length === 2) {
        year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
    }

    return `${year}-${month}-${day}`;
};

// --- Core Function: Passport Detail Extraction ---
const extractPassportDetails = (text = "") => {
    const cleanedText = text.replace(/\s+/g, " ").trim();
    const mrzReadyText = text.replace(/\r/g, "").trim();

    const result = {
        number: "",
        nationality: "",
        issueDate: "",
        expiryDate: "",
        placeOfIssue: "",
        dateOfBirth: "",
        sex: "",
        surname: "",
        givenNames: "",
        fatherName: "",
        motherName: "",
        spouseName: "",
        address: "",
    };

    // 1. MRZ Extraction (Highest Reliability)
    const mrzRegex = /([A-Z0-9<]{30,})\s*\n?([A-Z0-9<]{30,})\s*$/m;
    const mrzMatch = mrzReadyText.match(mrzRegex);

    if (mrzMatch) {
        const mrzLine1 = mrzMatch[1];
        const mrzLine2 = mrzMatch[2];

        result.number = mrzLine2.substring(0, 9).replace(/<| /g, "").trim();

        const dobMrz = mrzLine2.substring(13, 19);
        const expiryMrz = mrzLine2.substring(21, 27);

        if (dobMrz.length === 6) {
            result.dateOfBirth = formatDate(dobMrz);
        }

        if (expiryMrz.length === 6) {
            result.expiryDate = formatDate(expiryMrz);
        }

        result.sex = mrzLine2.substring(20, 21);

        const mrzNameSections = mrzLine1.substring(5).split("<<").filter(Boolean);
        if (mrzNameSections.length >= 1) {
            result.surname = mrzNameSections[0].replace(/<+/g, " ").trim();
        }
        if (mrzNameSections.length >= 2) {
            result.givenNames = mrzNameSections[1].replace(/<+/g, " ").trim();
        }
    }

    // 2. Standard Regex Extraction for remaining fields
    if (!result.number) {
        const numberRegex = /(Passport\s*(?:No\.?|Number)?[:\s]*)([A-Z0-9<]{6,})/i;
        const numberMatch = cleanedText.match(numberRegex);
        if (numberMatch) {
            result.number = numberMatch[2].replace(/[^A-Z0-9]/gi, "");
        } else {
            const fallbackNumber = cleanedText.match(/([A-Z]{1,2}\d{6,})/);
            if (fallbackNumber) {
                result.number = fallbackNumber[1];
            }
        }
    }

    const nationalityRegex = /(INDIAN|IND)/i;
    const nationalityMatch = cleanedText.match(nationalityRegex);
    if (nationalityMatch) {
        result.nationality = "INDIAN";
    }

    const placeRegex = /Place\s*of\s*Issue\s*[:\-]?\s*([A-Z\s]+)/i;
    const placeMatch = cleanedText.match(placeRegex);
    if (placeMatch) {
        result.placeOfIssue = placeMatch[1].trim().split(/\s{2,}/)[0];
    }

    const issueDateRegex = /Date\s*of\s*Issue\s*[:\-]?\s*([0-9]{1,2}[.\-/][0-9]{1,2}[.\-/][0-9]{2,4})/i;
    const issueMatch = cleanedText.match(issueDateRegex);
    if (issueMatch) {
        result.issueDate = formatDate(issueMatch[1]);
    }

    if (!result.expiryDate) {
        const expiryDateRegex = /Date\s*of\s*Expiry\s*[:\-]?\s*([0-9]{1,2}[.\-/][0-9]{1,2}[.\-/][0-9]{2,4})/i;
        const expiryMatch = cleanedText.match(expiryDateRegex);
        if (expiryMatch) {
            result.expiryDate = formatDate(expiryMatch[1]);
        }
    }

    const fatherRegex = /Name\s*of\s*Father\/Legal\s*Guardian\s*([A-Z\s]+)/i;
    const fatherMatch = cleanedText.match(fatherRegex);
    if (fatherMatch) {
        result.fatherName = fatherMatch[1].trim();
    }

    const motherRegex = /Name\s*of\s*Mother\s*([A-Z\s]+)/i;
    const motherMatch = cleanedText.match(motherRegex);
    if (motherMatch) {
        result.motherName = motherMatch[1].trim();
    }

    const spouseRegex = /Name\s*of\s*Spouse\s*([A-Z\s]+)/i;
    const spouseMatch = cleanedText.match(spouseRegex);
    if (spouseMatch) {
        result.spouseName = spouseMatch[1].trim();
    }

    const addressRegex = /Address\s*([A-Z0-9\s,.:\/-]+?)\s*(?:File\s*No|Passport\s*No)/i;
    const addressMatch = cleanedText.match(addressRegex);
    if (addressMatch) {
        result.address = addressMatch[1]
            .replace(/\s{2,}/g, " ")
            .replace(/\s+,/g, ",")
            .trim();
    }

    return result;
};

const isPdfFile = (file = {}) => {
    const mimeType = file.mimetype || "";
    const name = file.originalname || "";
    return mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf");
};

const callOcrSpace = async (fileBuffer, mimeType = "application/octet-stream") => {
    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
        return { text: "", warning: "OCR_SPACE_API_KEY is not configured." };
    }

    const payload = new URLSearchParams();
    payload.append("language", "eng");
    payload.append("isTable", "false");
    payload.append("scale", "true");
    payload.append("detectOrientation", "true");
    payload.append("OCREngine", "2");
    payload.append("base64Image", `data:${mimeType};base64,${fileBuffer.toString("base64")}`);

    try {
        const { data } = await axios.post(OCR_SPACE_ENDPOINT, payload, {
            headers: {
                apikey: apiKey,
            },
            timeout: 20000,
        });

        if (data?.IsErroredOnProcessing) {
            const errorMessage = Array.isArray(data?.ErrorMessage) ? data.ErrorMessage.join(", ") : data?.ErrorMessage;
            return { text: "", warning: errorMessage || "OCR provider failed to process the document." };
        }

        const parsedText = data?.ParsedResults?.map((result) => result?.ParsedText || "").join("\n");
        return { text: parsedText?.trim() || "", warning: "" };
    } catch (error) {
        console.error("OCR.space request failed:", error);
        return { text: "", warning: "OCR request failed. Please verify your OCR_SPACE_API_KEY or network connectivity." };
    }
};

// --- Controller Function ---
export const parsePassport = async (req, res) => {
    console.log("halooooooooooooooooo");

    if (!req.file) {
        return res.status(400).json({ message: "Passport file is required." });
    }

    const mimeType = req.file.mimetype || "";
    const isSupported = SUPPORTED_MIME_TYPES.some((type) =>
        type === "application/pdf" ? mimeType === type : mimeType === type
    );

    if (!isSupported) {
        return res.status(415).json({
            message: "Unsupported file type. Please upload a PDF or image (JPG, PNG, WEBP).",
        });
    }

    try {
        const sourcesUsed = [];
        const warnings = [];
        let text = "";

        if (isPdfFile(req.file)) {
            const parsedPdf = await pdfParse(req.file.buffer);
            text = parsedPdf.text || "";
            sourcesUsed.push("pdf-parse");
        }

        if (!text.trim() || text.trim().length < MIN_TEXT_LENGTH_FOR_PARSER) {
            const { text: ocrText, warning } = await callOcrSpace(req.file.buffer, mimeType);
            if (warning) {
                warnings.push(warning);
            }
            if (ocrText) {
                text = `${text}\n${ocrText}`.trim();
                sourcesUsed.push("ocr-space");
            }
        }

        if (!text.trim()) {
            return res.status(422).json({
                message: "Unable to extract text from the document. Please upload a clearer scan or configure OCR.",
                warnings,
            });
        }

        const details = extractPassportDetails(text);
        return res.json({
            status: "success",
            data: details,
            rawTextLength: text.length,
            sourcesUsed,
            warnings,
        });
    } catch (error) {
        console.error("Document AI parsing failed:", error);
        return res.status(500).json({
            message: "Failed to extract passport details. Please try again.",
            error: error.message,
        });
    }
};


export const extractPdfText = async (req, res) => {
    try {
        console.log('📄 PDF extraction endpoint hit');
        // Dynamic import for pdf-parse (ES module compatibility)
        const pdfParse = (await import('pdf-parse')).default;
        
        const { pdfData } = req.body; // Base64 PDF data

        if (!pdfData) {
            return res.status(400).json({ 
                message: 'PDF data is required',
                error: 'No PDF data provided'
            });
        }

        // Convert base64 to buffer
        let pdfBuffer;
        try {
            // Remove data URL prefix if present (data:application/pdf;base64,)
            const base64Data = pdfData.includes(',') 
                ? pdfData.split(',')[1] 
                : pdfData;
            
            pdfBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            return res.status(400).json({ 
                message: 'Invalid PDF data format',
                error: 'Failed to decode base64 PDF data'
            });
        }

        // Parse PDF
        const data = await pdfParse(pdfBuffer);

        return res.status(200).json({
            success: true,
            text: data.text,
            numPages: data.numpages,
            info: data.info,
            metadata: data.metadata
        });
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return res.status(500).json({
            message: 'Failed to extract text from PDF',
            error: error.message
        });
    }
};


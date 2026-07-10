const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use process.cwd() to be absolutely certain of the root directory
        const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');

        console.log(`[Multer] Processing upload. CWD: ${process.cwd()}`);
        console.log(`[Multer] Dest: ${uploadDir}`);

        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log(`[Multer] Created directory: ${uploadDir}`);
            } catch (err) {
                console.error(`[Multer] Failed to create directory ${uploadDir}:`, err);
                return cb(err);
            }
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Naming convention: employee_id_timestamp.ext
        // Use employee code if available (e.g. EMP001), otherwise fallback to user ID
        let identifier = req.user.empCode || req.user.id || 'unknown';
        // Sanitize identifier to prevent issues with special chars like / or \ in empCode
        identifier = identifier.replace(/[^a-zA-Z0-9]/g, '_');

        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${identifier}_${timestamp}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const limits = {
    fileSize: 5 * 1024 * 1024 // 5MB limit
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: limits
});

module.exports = upload;

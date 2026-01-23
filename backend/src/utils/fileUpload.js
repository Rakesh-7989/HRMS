const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { BadRequestError } = require('./customErrors');

// Ensure upload directories           
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const DOCUMENTS_DIR = path.join(UPLOAD_DIR, 'documents');
const PROFILE_PICS_DIR = path.join(UPLOAD_DIR, 'profile-pictures');

[UPLOAD_DIR, DOCUMENTS_DIR, PROFILE_PICS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// File type configuration
const FILE_TYPES = {
    documents: {
        mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/jpg'
        ],
        extensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
        maxSize: 5 * 1024 * 1024 // 5MB
    },
    images: {
        mimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'],
        extensions: ['.jpg', '.jpeg', '.png', '.gif'],
        maxSize: 2 * 1024 * 1024 // 2MB
    }
};

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadType = req.uploadType || 'documents';
        const dest = uploadType === 'profile' ? PROFILE_PICS_DIR : DOCUMENTS_DIR;
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        const sanitized = basename.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${sanitized}-${uniqueSuffix}${ext}`);
    }
});

/**
 * File filter function
 */
const fileFilter = (allowedTypes = 'documents') => {
    return (req, file, cb) => {
        const config = FILE_TYPES[allowedTypes] || FILE_TYPES.documents;
        const ext = path.extname(file.originalname).toLowerCase();

        if (!config.extensions.includes(ext)) {
            return cb(new BadRequestError(`Invalid file type. Allowed: ${config.extensions.join(', ')}`));
        }

        if (!config.mimeTypes.includes(file.mimetype)) {
            return cb(new BadRequestError(`Invalid file MIME type. Allowed: ${config.mimeTypes.join(', ')}`));
        }

        cb(null, true);
    };
};

/**
 * Create multer upload middleware for documents
 */
exports.uploadDocument = multer({
    storage,
    fileFilter: fileFilter('documents'),
    limits: {
        fileSize: FILE_TYPES.documents.maxSize
    }
});

/**
 * Create multer upload middleware for images
 */
exports.uploadImage = multer({
    storage,
    fileFilter: fileFilter('images'),
    limits: {
        fileSize: FILE_TYPES.images.maxSize
    }
});

/**
 * Validate file size
 */
exports.validateFileSize = (file, maxSize) => {
    if (!file) return true;
    return file.size <= maxSize;
};

/**
 * Validate file type
 */
exports.validateFileType = (file, allowedTypes) => {
    if (!file) return true;
    const ext = path.extname(file.originalname).toLowerCase();
    return allowedTypes.includes(ext);
};

/**
 * Delete a file from the filesystem
 */
exports.deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

/**
 * Get file extension
 */
exports.getFileExtension = (filename) => {
    return path.extname(filename).toLowerCase();
};

/**
 * Sanitize filename
 */
exports.sanitizeFilename = (filename) => {
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    return basename.replace(/[^a-zA-Z0-9]/g, '_') + ext;
};

/**
 * Get file MIME type from extension
 */
exports.getMimeType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
    };
    return mimeTypes[ext] || 'application/octet-stream';
};

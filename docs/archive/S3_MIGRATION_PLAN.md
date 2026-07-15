# AWS S3 Storage Migration Plan (Future)

This document outlines the steps required to migrate the HRMS-GZ application from local/PostgreSQL storage to AWS S3 for binary files (profile pictures, chat attachments, documents).

## 1. Prerequisites
- AWS Account with an IAM user.
- S3 Bucket created (e.g., `hrms-gz-storage`).
- IAM Policy with `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` permissions.

## 2. Environment Variables (`.env`)
Add the following keys to your backend `.env` file:
```bash
S3_REGION=us-east-1
S3_BUCKET_NAME=hrms-gz-storage
S3_ACCESS_KEY=your_access_key_id
S3_SECRET_KEY=your_secret_access_key
```

## 3. Necessary Dependencies
Install the AWS SDK in the backend:
```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 4. Implementation Steps

### A. Create a Storage Service
Create `backend/src/services/storage.service.js` to abstract S3 logic.
```javascript
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  }
});

exports.uploadFile = async (key, buffer, contentType) => {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  return await s3.send(command);
};

exports.getDownloadUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};
```

### B. Update Chat and Employee Modules
- **Upload**: When a file is received in `/chat/messages` or `/profile/upload`, call `storageService.uploadFile`.
- **Store**: Save only the **S3 Key** (the path in the bucket) in the database `file_url` or `profile_pic` columns.
- **Retrieve**: Before sending data to the frontend, convert the stored Key into a **Pre-signed URL** using `storageService.getDownloadUrl`.

## 5. Migration Strategy
1. **Parallel Run**: Update the code to support S3 but fallback to local storage if S3 keys are missing.
2. **Bulk Upload**: Run a script to copy existing files from any local `uploads/` folder to the S3 bucket.
3. **DB Update**: Update database rows to point to the new S3 keys.
4. **Switch**: Disable local storage logic.

---
> [!TIP]
> Using Pre-signed URLs is more secure than making the bucket public, as it prevents unauthorized access to private employee documents.

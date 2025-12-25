const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const tenantsData = require('../data/tenants.json');

// Google Drive API configuration
let driveClient = null;
let driveFolderId = null;

// Initialize Google Drive client
function initializeDrive() {
    try {
        const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!credentialsPath || !folderId) {
            console.log('⚠️ Google Drive credentials not configured. File upload to Drive will be skipped.');
            return false;
        }

        if (!fs.existsSync(credentialsPath)) {
            console.log('⚠️ Google Drive credentials file not found. File upload to Drive will be skipped.');
            return false;
        }

        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        const impersonateEmail = process.env.GOOGLE_IMPERSONATE_EMAIL || '';
        const scopes = ['https://www.googleapis.com/auth/drive.file'];

        let auth;
        if (impersonateEmail) {
            const { client_email, private_key } = credentials;
            auth = new google.auth.JWT({
                email: client_email,
                key: private_key,
                scopes,
                subject: impersonateEmail
            });
        } else {
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes
            });
        }

        driveClient = google.drive({ version: 'v3', auth });
        driveFolderId = folderId;

        console.log('✅ Google Drive initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Google Drive:', error.message);
        return false;
    }
}

const { Readable } = require('stream');

function bufferToStream(buffer) {
    return Readable.from(buffer);
}

// Find or create a folder in Google Drive
async function findOrCreateFolder(folderName, parentId = null) {
    if (!driveClient) return null;
    const parentFolderId = parentId || driveFolderId;

    try {
        // Search for the folder
        const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`;
        const response = await driveClient.files.list({
            q: query,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        if (response.data.files.length > 0) {
            // Folder found
            return response.data.files[0].id;
        } else {
            // Folder not found, create it
            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId]
            };
            const folder = await driveClient.files.create({
                resource: fileMetadata,
                fields: 'id',
                supportsAllDrives: true,
            });
            console.log(`✅ Folder created: ${folderName} (ID: ${folder.data.id})`);
            return folder.data.id;
        }
    } catch (error) {
        console.error(`❌ Error finding or creating folder "${folderName}":`, error.message);
        return null;
    }
}

// Get the folder ID for a specific tenant
async function getTenantFolderId(tenantName) {
    if (!tenantName) return driveFolderId;

    let floor = null;
    for (const floorNum in tenantsData.tenants) {
        if (Object.keys(tenantsData.tenants[floorNum]).includes(tenantName)) {
            floor = floorNum;
            break;
        }
    }

    if (!floor) {
        console.log(`⚠️ Tenant "${tenantName}" not found in tenants.json. Uploading to root folder.`);
        return driveFolderId;
    }

    const floorFolderName = `Lantai ${floor}`;
    const floorFolderId = await findOrCreateFolder(floorFolderName);

    if (!floorFolderId) {
        console.log(`❌ Could not find or create folder for "${floorFolderName}". Uploading to root folder.`);
        return driveFolderId;
    }

    const tenantFolderId = await findOrCreateFolder(tenantName, floorFolderId);
    return tenantFolderId || driveFolderId;
}


// Upload file to Google Drive
async function uploadFileToDrive(fileBuffer, fileName, mimeType = null, tenantName = null) {
    if (!driveClient || !driveFolderId) {
        console.log('⚠️ Google Drive not initialized, skipping upload');
        return null;
    }

    try {
        const targetFolderId = await getTenantFolderId(tenantName);

        if (!mimeType) {
            const ext = path.extname(fileName).toLowerCase();
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.pdf': 'application/pdf',
            };
            mimeType = mimeTypes[ext] || 'application/octet-stream';
        }

        const fileMetadata = {
            name: fileName,
            parents: [targetFolderId]
        };

        const media = {
            mimeType: mimeType,
            body: bufferToStream(fileBuffer)
        };

        const response = await driveClient.files.create({
            requestBody: fileMetadata,
            media,
            fields: 'id, name, webViewLink, webContentLink, driveId',
            supportsAllDrives: true
        });

        console.log(`✅ File uploaded to Google Drive: ${fileName} (ID: ${response.data.id})`);
        
        return {
            fileId: response.data.id,
            fileName: response.data.name,
            webViewLink: response.data.webViewLink,
            webContentLink: response.data.webContentLink || response.data.webViewLink
        };
    } catch (error) {
        console.error('❌ Error uploading file to Google Drive:', error.message);
        return null;
    }
}

// Upload base64 file to Google Drive
async function uploadBase64ToDrive(base64Data, fileName, mimeType = null, tenantName = null) {
    try {
        const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const buffer = Buffer.from(base64String, 'base64');
        
        return await uploadFileToDrive(buffer, fileName, mimeType, tenantName);
    } catch (error) {
        console.error('❌ Error converting base64 to buffer:', error.message);
        return null;
    }
}

if (require.main !== module) {
    initializeDrive();
}

module.exports = {
    initializeDrive,
    uploadFileToDrive,
    uploadBase64ToDrive
};
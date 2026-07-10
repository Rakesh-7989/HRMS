
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const frontendAssetsDir = path.join(__dirname, '../../frontend/src/assets');

if (!fs.existsSync(frontendAssetsDir)) {
    console.log(`Creating directory: ${frontendAssetsDir}`);
    fs.mkdirSync(frontendAssetsDir, { recursive: true });
}

// Ensure the directory is writable/exists (redundant but safe)
try {
    fs.accessSync(frontendAssetsDir, fs.constants.W_OK);
} catch (err) {
    console.error(`Cannot write to ${frontendAssetsDir}`);
    process.exit(1);
}

const assets = [
    { name: 'hrms_roles.png', text: 'HRMS Roles', color1: '#8E2DE2', color2: '#4A00E0' },
    { name: 'geofencing_visual.png', text: 'Geofencing', color1: '#11998e', color2: '#38ef7d' },
    { name: 'kanban_visual.png', text: 'Kanban Board', color1: '#fc4a1a', color2: '#f7b733' },
    { name: 'payroll_visual.png', text: 'Payroll', color1: '#c21500', color2: '#ffc500' },
    // Adding Logos
    { name: 'login_logo.png', text: 'GZ Logo', color1: '#1f1c2c', color2: '#928dab' },
    { name: 'light-logo.png', text: 'GZ Logo Light', color1: '#ffffff', color2: '#e6e9f0', textColor: '#000000' }
];

assets.forEach(asset => {
    const filePath = path.join(frontendAssetsDir, asset.name);
    if (fs.existsSync(filePath)) {
        console.log(`File exists, skipping: ${asset.name}`);
        return;
    }

    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, asset.color1);
    gradient.addColorStop(1, asset.color2);

    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add text
    ctx.fillStyle = asset.textColor || '#ffffff';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(asset.text, width / 2, height / 2);

    // Save file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);
    console.log(`Generated: ${filePath}`);
});

console.log('Frontend additional assets generation complete.');

const { createCanvas } = require('canvas');
const fs = require('fs-extra');
const path = require('path');

async function generateLogo() {
    const canvas = createCanvas(200, 40);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 40, 40);
    
    // YouTube play button style icon
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(30, 20);
    ctx.lineTo(10, 30);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Part-Time YouTuber', 50, 25);

    await fs.ensureDir('src/images');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('src/images/logo.png', buffer);
}

async function generateAvatar(index) {
    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext('2d');

    // Generate a unique color for each avatar
    const hue = (index * 37) % 360;
    ctx.fillStyle = `hsl(${hue}, 70%, 80%)`;
    ctx.fillRect(0, 0, 200, 200);

    // Add a simple pattern
    ctx.fillStyle = `hsl(${hue}, 70%, 70%)`;
    ctx.beginPath();
    ctx.arc(100, 80, 50, 0, Math.PI * 2);
    ctx.fill();

    // Add initials or number
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${index}`, 100, 120);

    const buffer = canvas.toBuffer('image/jpeg');
    fs.writeFileSync(`src/images/avatar${index}.jpg`, buffer);
}

async function generateImages() {
    await fs.ensureDir('src/images');
    
    // Generate logo
    await generateLogo();
    
    // Generate avatars
    for (let i = 1; i <= 10; i++) {
        await generateAvatar(i);
    }
}

generateImages().catch(console.error); 
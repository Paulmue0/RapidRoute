import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const ICON_SIZES = {
  // Basic icons
  'icon.png': 22, // macOS menubar icon
  '32x32.png': 32,
  '128x128.png': 128,
  '128x128@2x.png': 256,
  
  // Windows Store logos
  'StoreLogo.png': 50,
  'Square30x30Logo.png': 30,
  'Square44x44Logo.png': 44,
  'Square71x71Logo.png': 71,
  'Square89x89Logo.png': 89,
  'Square107x107Logo.png': 107,
  'Square142x142Logo.png': 142,
  'Square150x150Logo.png': 150,
  'Square284x284Logo.png': 284,
  'Square310x310Logo.png': 310,
  
  // Windows Store logos with scale variants
  'Square44x44Logo.targetsize-16.png': 16,
  'Square44x44Logo.targetsize-20.png': 20,
  'Square44x44Logo.targetsize-24.png': 24,
  'Square44x44Logo.targetsize-30.png': 30,
  'Square44x44Logo.targetsize-32.png': 32,
  'Square44x44Logo.targetsize-36.png': 36,
  'Square44x44Logo.targetsize-40.png': 40,
  'Square44x44Logo.targetsize-44.png': 44,
  'Square44x44Logo.targetsize-48.png': 48,
  'Square44x44Logo.targetsize-60.png': 60,
  'Square44x44Logo.targetsize-64.png': 64,
  'Square44x44Logo.targetsize-72.png': 72,
  'Square44x44Logo.targetsize-80.png': 80,
  'Square44x44Logo.targetsize-96.png': 96,
  'Square44x44Logo.targetsize-256.png': 256,
  
  // Alternate scales
  'StoreLogo.scale-100.png': 50,
  'StoreLogo.scale-125.png': 63,
  'StoreLogo.scale-150.png': 75,
  'StoreLogo.scale-200.png': 100,
  'StoreLogo.scale-400.png': 200,
  
  'Square150x150Logo.scale-100.png': 150,
  'Square150x150Logo.scale-125.png': 188,
  'Square150x150Logo.scale-150.png': 225,
  'Square150x150Logo.scale-200.png': 300,
  'Square150x150Logo.scale-400.png': 600,
  
  'Square310x310Logo.scale-100.png': 310,
  'Square310x310Logo.scale-125.png': 388,
  'Square310x310Logo.scale-150.png': 465,
  'Square310x310Logo.scale-200.png': 620,
  'Square310x310Logo.scale-400.png': 1240,
};

// Public folder icons (for web)
const PUBLIC_ICONS = {
  'icon.png': 512,
  'apple-touch-icon.png': 180,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512,
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
};

async function generateIcons() {
  const sourceIcon = './src/assets/icon.png'; // Your source icon
  const tauriOutputDir = './src-tauri/icons';
  const publicOutputDir = './public';

  // Ensure the output directories exist
  await fs.mkdir(tauriOutputDir, { recursive: true });
  await fs.mkdir(publicOutputDir, { recursive: true });

  // Generate Tauri icons
  for (const [filename, size] of Object.entries(ICON_SIZES)) {
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(tauriOutputDir, filename));
    
    console.log(`Generated Tauri icon: ${filename} (${size}x${size})`);
  }

  // Generate public folder icons
  for (const [filename, size] of Object.entries(PUBLIC_ICONS)) {
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicOutputDir, filename));
    
    console.log(`Generated public icon: ${filename} (${size}x${size})`);
  }

  // Generate safari-pinned-tab.svg
  const svgBuffer = await sharp(sourceIcon)
    .resize(512, 512)
    .png()
    .toBuffer();

  // Convert PNG buffer to base64
  const base64Image = svgBuffer.toString('base64');
  
  // Create SVG with embedded PNG
  const svgContent = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="512pt" height="512pt" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet">
  <image width="512" height="512" href="data:image/png;base64,${base64Image}"/>
</svg>`;

  await fs.writeFile(path.join(publicOutputDir, 'safari-pinned-tab.svg'), svgContent);
  console.log('Generated safari-pinned-tab.svg');

  // Generate favicon.ico (16x16 and 32x32 combined)
  const favicon16 = await sharp(sourceIcon)
    .resize(16, 16, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  const favicon32 = await sharp(sourceIcon)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  // Write both buffers to the ICO file
  await fs.writeFile(path.join(publicOutputDir, 'favicon.ico'), Buffer.concat([favicon16, favicon32]));
  console.log('Generated favicon.ico');

  // Generate macOS .icns file
  const icnsBuffer = await sharp(sourceIcon)
    .resize(1024, 1024)
    .png()
    .toBuffer();

  await fs.writeFile(path.join(tauriOutputDir, 'icon.icns'), icnsBuffer);
  console.log('Generated icon.icns');

  // Generate Windows .ico file for Tauri
  const icoBuffer = await sharp(sourceIcon)
    .resize(256, 256)
    .png()
    .toBuffer();

  await fs.writeFile(path.join(tauriOutputDir, 'icon.ico'), icoBuffer);
  console.log('Generated icon.ico');
}

generateIcons().catch(console.error); 
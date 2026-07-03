const { Jimp } = require('jimp');
const fs = require('fs');

const sizes = {
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192
};

async function generateIcons() {
  const image = await Jimp.read('Logo.png');
  image.autocrop(); // Remove transparent padding
  
  for (const [dpi, size] of Object.entries(sizes)) {
    const clone = image.clone();
    clone.resize({ w: size, h: size });
    
    // Save to the local app directory to avoid OneDrive lock issues
    const resDir = `C:\\Users\\Admin\\ivad-rh-app-local\\app\\src\\main\\res\\mipmap-${dpi}`;
    
    if (fs.existsSync(resDir)) {
      await clone.write(`${resDir}\\ic_launcher.png`);
      await clone.write(`${resDir}\\ic_launcher_round.png`);
      console.log(`Saved ${dpi} to ${resDir}`);
    } else {
      console.log(`Directory not found: ${resDir}`);
    }
  }
}

generateIcons().catch(console.error);

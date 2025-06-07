// build.js - Custom build script for NFT Gallery
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run the standard Vite build
console.log('Running Vite build...');
execSync('npm run build', { stdio: 'inherit' });

// Ensure all HTML files are properly copied to dist
console.log('Ensuring all HTML files are in dist...');
const htmlFiles = [
  'index.html',
  'room2.html',
  'room3.html',
  'room4.html',
  'room5.html',
  'room6.html',
  'room7.html'
];

htmlFiles.forEach(file => {
  // Check if the file exists in dist after build
  const distPath = path.join(__dirname, 'dist', file);
  if (!fs.existsSync(distPath)) {
    console.log(`Copying ${file} to dist...`);
    fs.copyFileSync(path.join(__dirname, file), distPath);
  }
});

console.log('Build completed successfully!');

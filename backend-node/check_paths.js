import { execSync } from 'child_process';
import fs from 'fs';

const paths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

paths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`FOUND: ${p}`);
  } else {
    console.log(`NOT FOUND: ${p}`);
  }
});

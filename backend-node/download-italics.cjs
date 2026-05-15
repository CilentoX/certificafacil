const fs = require('fs');
const https = require('https');
const path = require('path');

const fonts = {
  'Inter-Italic.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Italic.ttf',
  'Inter-BoldItalic.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-BoldItalic.ttf',
  'Roboto-Italic.ttf': 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Italic.ttf',
  'Roboto-BoldItalic.ttf': 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-BoldItalic.ttf',
  'Montserrat-Italic.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Italic.ttf',
  'Montserrat-BoldItalic.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-BoldItalic.ttf',
  'Open Sans-Italic.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/static/OpenSans-Italic.ttf',
  'Open Sans-BoldItalic.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/static/OpenSans-BoldItalic.ttf'
};

const dir = path.join(__dirname, 'assets', 'fonts');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

async function download() {
  for (const [name, url] of Object.entries(fonts)) {
    const dest = path.join(dir, name);
    console.log(`Downloading ${name}...`);
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    });
  }
  console.log('All italic fonts downloaded.');
}

download();

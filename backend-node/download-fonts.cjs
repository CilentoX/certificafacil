const fs = require('fs');
const https = require('https');
const path = require('path');

const fonts = {
  'Inter-Regular.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Regular.ttf',
  'Inter-Bold.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Bold.ttf',
  'Roboto-Regular.ttf': 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Regular.ttf',
  'Roboto-Bold.ttf': 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Bold.ttf',
  'Montserrat-Regular.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Regular.ttf',
  'Montserrat-Bold.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Bold.ttf',
  'OpenSans-Regular.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/static/OpenSans-Regular.ttf',
  'OpenSans-Bold.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/static/OpenSans-Bold.ttf'
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
  console.log('All fonts downloaded.');
}

download();

const dotenv = require('dotenv');
dotenv.config();
const dayJs = require('dayjs');
const ftp = require("basic-ftp")
const Fs = require('fs');
const Path = require('path');
const Axios = require('axios');

const FTP_HOST = process.env.FTP_HOST;
const FTP_USER= process.env.FTP_USER;
const FTP_PASSWORD = process.env.FTP_PASSWORD;
const FTP_BASE_PATH = process.env.FTP_BASE_PATH; // without trailing backslash
const LOCAL_PATH = process.env.LOCAL_PATH; // without trailing backslash

async function uploadFile(sourceFilePath, targetFilePath) {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
      secure: false
    })
    console.log(await client.list());
    await client.ensureDir(Path.dirname(targetFilePath));
    await client.uploadFrom(sourceFilePath, targetFilePath);
  }
  catch(err) {
    console.log(err)
  }
  client.close()
}

function ensureDirectoryExists(dir) {
  if (Fs.existsSync(dir)) {
    return true;
  }
  Fs.mkdirSync(dir);
}

async function downloadImage (url, localPath) {
  const datetime = dayJs().format('YYYYMMDD_hhmmss');
  ensureDirectoryExists(localPath);
  const path = Path.resolve(localPath, `${datetime}.jpg`);
  const writer = Fs.createWriteStream(path);

  const response = await Axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve(path));
    writer.on('error', reject);
  })
}

const webcams = [
  {
    name: 'venta-marcelino-1',
    endpoint: 'https://www.ventamarcelino.com/webcam_1.jpg',

  }
];

async function runJob() {
  for (webcam of webcams) {
    try {
      const tmpPath = await downloadImage(webcam.endpoint, `${LOCAL_PATH}/${webcam.name}`);
      const filename = Path.basename(tmpPath);
      await uploadFile(`${LOCAL_PATH}/${webcam.name}/${filename}`, `${FTP_BASE_PATH}/${webcam.name}/${filename}`);
      Fs.unlinkSync(`${LOCAL_PATH}/${webcam.name}/${filename}`); // removes tmp since upload has success
      console.log(`✅ Download success: ${webcam.endpoint}`);
    } catch (Error) {
      console.log(`❌ Download error: ${webcam.endpoint} - ${Error}`);
    }
  }
}

runJob();
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
  const datetime = dayJs().format('YYYYMMDD_HHmmss');
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
  },
  {
    name: 'venta-marcelino-2',
    endpoint: 'https://www.ventamarcelino.com/webcam_2.jpg',
  },
  {
    name: 'venta-marcelino-3',
    endpoint: 'https://infocar.dgt.es/etraffic/data/camaras/161042.jpg',
  },
  {
    name: 'venta-marcelino-4',
    endpoint: 'https://ventamarcelino.com/meteo/foto.jpg',
  },
  {
    name: 'refugio-poqueira-1',
    endpoint: 'http://37.130.145.254:8080/cgi-bin/faststream.jpg?fps=1&date=1',
  },
  {
    name: 'refugio-poqueira-2',
    endpoint: 'http://37.130.145.254:8081/cgi-bin/image.jpg?camera=right&customsize=640x480&date=1&rotate=90;date=1',
  },
  {
    name: 'refugio-poqueira-3',
    endpoint: 'http://37.130.145.254:8081/cgi-bin/image.jpg?camera=left&customsize=640x480&date=1&rotate=180;date=1',
  },
  {
    name: 'refugio-poqueira-4',
    endpoint: 'http://37.130.145.254:8084/cgi-bin/view/image?pro_1',
  },
  {
    name: 'sierra-nevada-borreguiles',
    endpoint: 'http://wtvhspt.feratel.com/hotspot/35/15111/1.jpeg?&ap=1&design=v3',
  },
  {
    name: 'navacerrada-1',
    endpoint: 'https://puertonavacerrada.com/webcam/WEBcamPala.jpg',
  },
  {
    name: 'navacerrada-2',
    endpoint: 'https://infocar.dgt.es/etraffic/data/camaras/163996.jpg',
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
  process.exit();
}

(async () => {
  await runJob();
})()
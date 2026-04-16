const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const readline = require('readline');

// correção:
const open = (...args) => import('open').then(m => m.default(...args));

const CREDENTIALS_PATH = './credentials.json';
const TOKEN_PATH = './token.json';

function authorize(callback) {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
        callback(oAuth2Client);
    } else {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/youtube.upload'],
        });

        console.log('📎 Autorize este app visitando o link:');
        console.log(authUrl);
        open(authUrl);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question('🧾 Cole o código aqui: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) throw err;
                oAuth2Client.setCredentials(token);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                callback(oAuth2Client);
            });
        });
    }
}

function uploadVideo(filePath, titulo, descricao, callback) {
    authorize(async (auth) => {
        const service = google.youtube({ version: 'v3', auth });
        const fileSize = fs.statSync(filePath).size;

        const res = await service.videos.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: titulo,
                    description: descricao,
                },
                status: {
                    privacyStatus: 'private', // ou 'unlisted' se preferir
                },
            },
            media: {
                body: fs.createReadStream(filePath),
            },
        }, {
            onUploadProgress: evt => {
                const progress = (evt.bytesRead / fileSize) * 100;
                process.stdout.write(`Progresso: ${progress.toFixed(2)}%\r`);
            }
        });

        const videoId = res.data.id;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`\n✅ Vídeo enviado para o YouTube! URL: ${videoUrl}`);
        callback(videoUrl);
    });
}

module.exports = uploadVideo;

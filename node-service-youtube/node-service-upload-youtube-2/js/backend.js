const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ftp = require('basic-ftp');
const axios = require('axios');

const ftpConfig = {
    host: 'ftp.seusite.com',
    user: 'usuario_ftp',
    password: 'senha_ftp',
    secure: false
};

const apiEndpoint = 'http://localhost:3000/upload';

async function gerarHashDoArquivo(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function enviarArquivoParaFTP(localPath, nomeFinal) {
    const client = new ftp.Client();
    try {
        await client.access(ftpConfig);
        await client.ensureDir('upload/videos');
        await client.uploadFrom(localPath, nomeFinal);
    } catch (err) {
        throw new Error('Erro ao enviar via FTP: ' + err.message);
    } finally {
        client.close();
    }
}

async function enviarPostParaAPI(dados) {
    const response = await axios.post(apiEndpoint, dados);
    return response.data;
}

async function processarVideo(filePath, titulo, descricao, setor, categoria) {
    const hash = await gerarHashDoArquivo(filePath);
    const ext = path.extname(filePath);
    const hashFileName = `${hash}${ext}`;

    await enviarArquivoParaFTP(filePath, hashFileName);

    const dados = {
        hash,
        titulo,
        descricao,
        setor,
        categoria,
        data_upload: new Date().toISOString()
    };

    const resposta = await enviarPostParaAPI(dados);
    console.log('Resposta da API:', resposta);
}

// USO:
processarVideo(
    './videos/meu_video.mp4',
    'Treinamento Segurança',
    'Descrição do vídeo',
    'RH',
    'Treinamento'
).catch(console.error);

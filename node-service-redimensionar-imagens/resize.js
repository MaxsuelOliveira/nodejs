const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Valor do prompt.
const filepath = process.argv[2];

// Nome do diretorio
const dirname = path.dirname(filepath)

// Hook
const [filename, extension] = path.basename(filepath).split(".")

// Destino
const destination = `${dirname}/redimensionado`

if (!fs.existsSync(destination)) {
    // Criando diretorio
    fs.mkdirSync(destination)
}

// Tamanho das imagens
const sizes = [128, 48, 32, 24, 16]

// Tamanhos dinâmicos.
sizes.forEach(size => {
    sharp(filepath).clone()
        .resize({ width: size })
        .toFile(`${destination}\\${filename}-${size}.${extension}`)
        .then(info => {
            console.log(info)
        }).catch(error => {
            console.log(error)
        })
})


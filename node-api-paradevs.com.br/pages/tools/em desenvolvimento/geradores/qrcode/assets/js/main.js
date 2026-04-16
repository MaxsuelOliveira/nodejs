let qrcode = new QRCode("qrcode", {
    width: 210,
    height: 210,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
});

let input = document.querySelector("textarea");
input.addEventListener("keyup", (event) => {
    qrcode.makeCode(input.value);
})

let save = document.querySelector("#save");
save.addEventListener("click", () => {
    if (document.querySelector("img").src.length !== 0) {
        alert("Aguarde o donwload.");
        downloadImage(document.querySelector("img").src , document.querySelector("#qrcode").title);
    } else {
        alert("Desculpe não foi possivel baixar o qrcode.");
    }
}, save.addEventListener("doubleclick", () => {
    console.log("Aguarde o download.")
}));

// Salvar QRCODE
async function downloadImage(imageSrc, title) {
    const image = await fetch(imageSrc)
    const imageBlog = await image.blob()
    const imageURL = URL.createObjectURL(imageBlog)

    const link = document.createElement('a');
    link.href = imageURL;
    link.download = title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

let edit = document.querySelector("#edit");
edit.addEventListener("click", () => {
    $("#modal").modal('show');
})

let colorDark = document.querySelector("#colorDark");
colorDark.addEventListener("change", () => {
    qrcode._htOption.colorDark = colorDark.value;
    qrcode.makeCode(input.value);
})

let colorLight = document.querySelector("#colorLight");
colorLight.addEventListener("change", () => {
    qrcode._htOption.colorLight = colorLight.value;
    qrcode.makeCode(input.value);
})

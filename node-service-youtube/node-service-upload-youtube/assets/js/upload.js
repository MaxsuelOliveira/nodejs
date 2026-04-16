document
  .getElementById("uploadForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const file = formData.get("file");

    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    console.log("Uploading file:", file.name);
    console.log("File size:", file.size, "bytes");
    console.log("File type:", file.type);
    console.log("File last modified:", file.lastModifiedDate);
    console.log(formData);
    return;

    const res = await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    document.getElementById("resultado").innerHTML = result.sucesso
      ? `<div class="alert alert-success">Enviado com sucesso! <a href="${result.url}" target="_blank">Ver vídeo</a></div>`
      : `<div class="alert alert-danger">Erro: ${result.erro}</div>`;
  });

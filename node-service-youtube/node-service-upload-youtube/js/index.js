async function carregarVideos() {
  const search = document.getElementById("search").value;
  const setor = document.getElementById("setor").value;
  const categoria = document.getElementById("categoria").value;

  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (setor) params.append("setor", setor);
  if (categoria) params.append("categoria", categoria);

  const res = await fetch(`http://localhost:3000/videos?${params.toString()}`);
  const videos = await res.json();

  const lista = document.getElementById("lista-videos");
  lista.innerHTML = "";
  videos.forEach((v) => {
    lista.innerHTML += `
<div class="col-md-4">
  <div class="card mb-3">
    <div class="card-body">
      <h5>${v.titulo}</h5>
      <p>${v.descricao}</p>
      <p><small>${v.setor} | ${v.categoria}</small></p>
      <a href="${v.hash}" target="_blank" class="btn btn-sm btn-outline-primary">YouTube</a>
      <button class="btn btn-sm btn-warning" onclick="abrirEdicao(${v.id}, '${v.titulo}', '${v.descricao}', '${v.setor}', '${v.categoria}')">Editar</button>
      <button class="btn btn-sm btn-danger" onclick="abrirRemocao(${v.id})">Remover</button>
    </div>
  </div>
</div>`;
  });
}

function abrirEdicao(id, titulo, descricao, setor, categoria) {
  document.getElementById("edit-id").value = id;
  document.getElementById("edit-titulo").value = titulo;
  document.getElementById("edit-descricao").value = descricao;
  document.getElementById("edit-setor").value = setor;
  document.getElementById("edit-categoria").value = categoria;
  new bootstrap.Modal(document.getElementById("modalEditar")).show();
}

function salvarEdicao() {
  const id = document.getElementById("edit-id").value;
  fetch(`http://localhost:3000/videos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: document.getElementById("edit-titulo").value,
      descricao: document.getElementById("edit-descricao").value,
      setor: document.getElementById("edit-setor").value,
      categoria: document.getElementById("edit-categoria").value,
    }),
  }).then(() => {
    bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();
    carregarVideos();
  });
}

function abrirRemocao(id) {
  document.getElementById("delete-id").value = id;
  new bootstrap.Modal(document.getElementById("modalRemover")).show();
}

function removerVideo() {
  const id = document.getElementById("delete-id").value;
  fetch(`http://localhost:3000/videos/${id}`, { method: "DELETE" }).then(() => {
    bootstrap.Modal.getInstance(document.getElementById("modalRemover")).hide();
    carregarVideos();
  });
}

window.onload = carregarVideos;
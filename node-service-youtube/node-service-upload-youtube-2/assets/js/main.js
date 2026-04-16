async function getCategorias(id) {
  const response = await fetch("http://127.0.0.1:5500/data/json/categorias.json");
  const data = await response.json();

  const resultado = data.find((item) => item.id === id);
  return resultado ? resultado.categorias : [];
}

fetch("http://127.0.0.1:5500/data/json/categorias.json")
  .then((response) => response.json())
  .then((data) => {
    data.forEach(({ id, setor, categorias }) => {
      // Check if the item has a 'valor' property
      if (setor) {
        let option = document.createElement("option");
        option.id = "setorSelect";
        option.value = id;
        option.text = setor;
        document.getElementById("setorSelect").appendChild(option);
      }

      // if (categorias) {
      //   categorias.forEach((categoria) => {
      //     let option = document.createElement("option");
      //     option.id = "categoriaSelect";
      //     option.value = categoria;
      //     option.text = categoria;
      //     document.getElementById("categoriaSelect").appendChild(option);
      //   });
      // }
    });

    document
      .getElementById("setorSelect")
      .addEventListener("click", (event) => {
        const selectedSetor = document.getElementById("setorSelect").value;

        getCategorias(selectedSetor).then((categorias) => {
          console.log(categorias);

          const categoriaSelect = document.getElementById("categoriaSelect");
          categoriaSelect.innerHTML = ""; // Clear previous options

          categorias.forEach((categoria) => {
            let option = document.createElement("option");
            option.value = categoria;
            option.text = categoria;
            categoriaSelect.appendChild(option);
          });
        });
      });
  })
  .catch((error) => console.error("Error fetching data:", error));

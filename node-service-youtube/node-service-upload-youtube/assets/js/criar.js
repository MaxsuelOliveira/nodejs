const categoriasData = [];

async function getCategorias(setor, id) {
  try {
    const response = await fetch(
      "https://proton.mysuite1.com.br/client/ajax/custom/get_valor_campos.php",
      {
        method: "POST",
        headers: {
          accept: "application/json, text/javascript, */*; q=0.01",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          cookie:
            "PHPSESSID=4cde3e7fad08a450f2a96609d87c0370; alertsom=1; lembreme=1; email=ssafra%40lv.com",
          Referer: "https://proton.mysuite1.com.br/client/index.php",
        },
        body: `nomecampo=bzpcategoria&metodocustom=novoRegistro&dadosformulario%5Bbzpdepartamento%5D=${id}&metodo=getValorCampos&formulario=hd_padrao&tipocampo=2`,
      }
    );

    const data = await response.json();
    const categorias = data.valorescombo.split(";").map((cat) => cat.trim());

    const obj = {
      id,
      setor,
      categorias,
    };

    categoriasData.push(obj);
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
  }
}

async function getSetores() {
  try {
    const response = await fetch(
      "https://proton.mysuite1.com.br/client/ajax/busca_customizacao.php",
      {
        method: "POST",
        headers: {
          accept: "application/json, text/javascript, */*; q=0.01",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          cookie:
            "PHPSESSID=4cde3e7fad08a450f2a96609d87c0370; alertsom=1; lembreme=1; email=ssafra%40lv.com",
          Referer: "https://proton.mysuite1.com.br/client/index.php",
        },
        body: "formulario=hd_padrao&campochave=&metodo=novoRegistro&helpdesk=true&filtro=false&codClienteLogado=496&codSiglaClienteLogado=pto",
      }
    );

    const data = await response.json();

    const campos = data.retorno.campos;

    for (const campo of campos) {
      if (campo.resultadoscombo) {
        const labels = campo.valorescombo.split(";");
        const ids = campo.resultadoscombo.split(";");

        for (let i = 0; i < labels.length; i++) {
          const label = labels[i].trim();
          const id = ids[i]?.trim();

          if (label && id) {
            console.log(`🔍 Buscando categorias para: ${label} (${id})`);
            await getCategorias(label, id);
          }
        }
      }
    }

    return JSON.stringify(categoriasData, null, 2);
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
  }
}

// Iniciar
console.log("🔄 Buscando setores e categorias...");
getSetores().then((result) => {
    console.log("✅ Setores e categorias obtidos com sucesso!");
    console.log(result);
});

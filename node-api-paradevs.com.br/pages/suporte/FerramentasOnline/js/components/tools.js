function showMenuApp(event) {
  let menu_display = document.querySelector(".menu-display");
  menu_display.classList.length === 1
    ? menu_display.classList.add("menu-active")
    : menu_display.classList.remove("menu-active");
}

let ferramentas = {


  cnpj: {

    submit: function () {
      document.querySelector("").addEventListener("submit", function (event) {
        event.preventDefault();

        console.log("consultando ...");

        this.get(cnpj)
          .then((response) => {
            console.log(response);
          })
          .catch((error) => {
            console.log(error);
          });
      });
    },
    
    get: function (cnpj) {
      const url = `https://www.receitaws.com.br/v1/cnpj/${cnpj}`;

      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          // Aqui você pode tratar os dados retornados da consulta
          console.log(data);
        })
        .catch((error) => {
          // Trate erros caso ocorra algum problema na requisição
          console.error(error);
        });
    },

    set : function (data){
        console.log(data);
    },

  },

  


};

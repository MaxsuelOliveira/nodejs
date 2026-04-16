let dados_salvos = [];
let url_email = "https://www.invertexto.com/gerador-email-temporario?email=";
let texto_compatilhar = [];
let whatsapp = "77999244588";

const main = {

    validador: {

        set: function (form) {
            try {
                dados = form[0].value;
                dadosJson = JSON.parse(dados);
                dados_salvos = dadosJson;
                return dados_salvos;

            } catch (error) {
                return error
            }
        },
        
        get: async function(data) {

          
           try {
                const propertyNames = Object.keys(data);
                console.log(propertyNames);

                let set = new Set(propertyNames);
                return Promise.resolve( set);
           } catch (error) {
                return Promise.reject(error);
           }
        },

        SetValues: function (values) {
            $("#exampleModal #inputs").empty();
            values.forEach(element => {
            
                $("#exampleModal #inputs").append(`
                    <input type="checkbox" id="${element}" name="${element}" value="${element}">
                    <label for="${element}">${element}</label>
                `);

            });

            $('#exampleModal').modal('show');
        }


    },

    notification: {
        push: function () {

        }
    },

    clickBoard: {
        set: function (element) {
            if (!navigator.clipboard) {
                console.log("Não suporta clipboard");
            }

            navigator.clipboard.writeText(element)
                .then(() => {

                    main.Toast.fire({
                        icon: 'success',
                        title: element
                    })

                })
                .catch(err => {
                    console.log('aconteceu um erro : ' + err);
                });
        }
    },

    share: function (texto) {

        if (navigator.share !== undefined) {
            console.log("compatilhando");
            navigator.share({
                title: 'Separador de dados.',
                text: 'Seperando dados json de forma rápida.',
                url: `https://api.whatsapp.com/send?phone=${whatsapp}&text=` + texto,
            })
                .then(() => {
                    console.log('Compartilhando com sucesso.');
                    texto_compatilhar.splice(0, texto_compatilhar.length);
                })
                .catch((error) => console.log('Error sharing', error));
        }

    },

    Toast: Swal.mixin({
        toast: true,
        position: 'bottom-start',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    })

}

const form = document.querySelector('form');

form.addEventListener('submit', function (e) {
    e.preventDefault();

    let dados_salvos = main.validador.set(form);
    main.validador.get(dados_salvos).then((result) => {
        main.validador.SetValues(result);

    }).catch((err) => {
        alert(err);
    });;

  
    // Criando resultados
    dados_salvos.forEach(function (element, index) {

        // element.email = element.email.split("@")[0] + "@" + main.validador.set(form)[2];

        // $("#resultados").append(`

        //     <div class="resultado shadow-sm">

        //         <header>

        //             <span class="badge rounded-pill bg-primary">${index + 1}</span>

        //             <div class="controlls">
        //                 <button type="button" class="btn btn-danger" id="deletar" title="apagar seção"> <i class="fa-solid fa-trash"></i> </button> 
        //                 <button type="button" class="btn btn-primary" id="compartilhar" title="compartilhar seção"> <i class="fa-solid fa-share"></i> </button> 
        //                 <button type="button" class="btn btn-success" id="marcar" title="marcar como já usado"> <i class="fa-solid fa-check"></i> </button>
        //             </div>

        //         </header>

        //         <div>
        //             <label class="form-label">Nome completo</label>
        //             <div class="input-group mb-3">
        //                 <input type="text" class="form-control" value="${element.nome}" placeholder="Nome" disabled>
        //                 <button class="btn btn-outline-secondary copy" type="button" title="clique para copiar"><i class="fa-solid fa-copy"></i></button>
        //             </div>
        //         </div>

        //         <div>
        //             <label class="form-label">Email</label>
        //             <div class="input-group mb-3">
        //                 <input type="url" class="form-control" value="${element.email}" placeholder="email@provedor.com"
        //                 readonly title="clique para abir a janela com o email.">
        //                 <button class="btn btn-outline-secondary copy" type="button" title="clique para copiar"><i class="fa-solid fa-copy"></i></button>
        //             </div>
        //         </div>

        //         <div>
        //             <label class="form-label">CPF</label>
        //             <div class="input-group mb-3">
        //                 <input type="text" class="form-control" value="${element.cpf}" placeholder="000.000.000-00" disabled>
        //             <button class="btn btn-outline-secondary copy" type="button" title="clique para copiar"><i class="fa-solid fa-copy"></i></button>
        //             </div>
        //         </div>

        //         <div>
        //             <label class="form-label">Celular</label>
        //             <div class="input-group mb-3">
        //                 <input type="tel" class="form-control" value="${element.celular}" placeholder="(99)99999-9999" disabled>
        //                 <button class="btn btn-outline-secondary copy" type="button" title="clique para copiar"><i class="fa-solid fa-copy"></i></button>
        //             </div>
        //         </div>

        //     </div>
        // `);

    });

    // copiar valores
    Array.from(document.querySelectorAll('#resultados .copy')).forEach(element => {
        element.addEventListener('click', function (e) {

            let valor_copiar = element.parentElement.querySelector('input').value;

            if (valor_copiar !== null) {
                main.clickBoard.set(valor_copiar);
            }

        });
    });

    // compartilhar o texto dos dados
    Array.from(document.querySelectorAll('#compartilhar')).forEach(element => {
        element.addEventListener('click', function (e) {
            e.target.parentElement.parentElement.querySelectorAll('[value]').forEach(item => {
                texto_compatilhar.push(item.getAttribute("value"));
            });
            main.share(texto_compatilhar.join(' /n '));
        });

    });

    // deletar dado
    document.querySelectorAll('#deletar').forEach(element => {
        element.addEventListener('click', function (e) {
            e.target.parentElement.parentElement.remove();
        });
    });

    // // abrindo página já com o email
    // document.querySelectorAll("[type='url']").forEach(element => {
    //     element.addEventListener("click", function (event) {
    //         window.open((url_email + element.value), "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=0,left=0,width=600,height=600");
    //     })
    // });


});

form.addEventListener("reset", function (e) {
    e.preventDefault();
    document.querySelector("#resultados").innerHTML = "";
});

let inputsModal = document.querySelector("#exampleModal form");

inputsModal.addEventListener("submit", function (event) {
    event.preventDefault();

    // alert("Separando dados");
    let valores = []

    inputsModal.querySelectorAll("input").forEach(element => {

        if (element.checked == true) {
            valores.push(element.value);

            if(element.value in dados_salvos[0]) {
                console.log("Existe!");
                // removendo os que não existem !
            }
            
            // 

            const propertyNames = Object.keys(person);

            console.log(propertyNames);
        

           
             
        }

    });

 
});

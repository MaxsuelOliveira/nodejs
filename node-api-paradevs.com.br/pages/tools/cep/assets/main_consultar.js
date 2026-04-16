$("#cep").mask("99999-999");

let form = document.querySelector("form");
let result = document.querySelector("#result");

async function get(cep) {
    let response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (response.ok) {
        let json = await response.json();
        if (json.erro) {
            return Promise.reject(json.erro);
        } else { 
            document.querySelectorAll("#result .form-control").forEach(element => {
                element.classList.add("loading-elements");
            });
        return Promise.resolve(json);
    }
    } else {
        return Promise.reject(response.status)
    }
}

async function set(response) {

    try {

        document.querySelector("#resultado").value = response.logradouro
        document.querySelector("#rua").value = response.logradouro
        document.querySelector("#bairro").value = response.bairro
        document.querySelector("#complemento").value = response.complemento
        document.querySelector("#cidade").value = response.localidade
        document.querySelector("#estado").value = response.uf

        return Promise.resolve("finalizado");
        
    } catch (error) {
        console.log(error);
    }
    
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    let cep = form[0].value;

    if (cep.length < 9) {
        console.log("cep inválido.")
    } else if (cep.length == 0) {
        console.log("Cep não poder ser vazio.")
    } else {

        get(cep).then((result) => {
    
            set(result).then((result) => {

                document.querySelectorAll("#result .form-control").forEach(element => {
                    element.classList.remove("loading-elements")
                });

            }).catch((err) => {
                alert("CEP não encontrado !")
            });

        }).catch((err) => {
            alert("CEP não encontrado !")
        });
    }

});


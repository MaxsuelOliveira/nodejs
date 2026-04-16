let one = 0;
let two = 0;
let funcao = null;
let resultado = null;

document.querySelectorAll("#numeros button").forEach(element => {
    element.addEventListener("click", (event) => {
        event.preventDefault();

        document.querySelector("#two").value = document.querySelector("#two").value + element.value;

        if (document.querySelector("#two").getAttribute("placeholder") === null) {
            two = document.querySelector("#two").value;
        } else {
            one = document.querySelector("#two").value;
        }

    });
});

document.querySelectorAll("#funcoes button").forEach(element => {
    element.addEventListener("click", (event) => {
        event.preventDefault();

        switch (element.value) {

            case "-":
               set("-")
                break;
            
            case "+":
                set("+")
                break;

            case "*":
                set("*")
                break;

            case "/":
                set("/")
                break;

            case "=":

           

                switch (funcao) {
                    case "-":
                        console.log(`resultado da expressão é : ${two - one}`);
                        break;

                    case "+":
                        console.log(`resultado da expressão é : ${two + one}`);
                        break;

                    case "*":
                        console.log(`resultado da expressão é : ${two * one}`);
                        break;

                    case "/":
                        console.log(`resultado da expressão é : ${two / one}`);
                        break;

                    default:
                        document.querySelector("#two div").innerHTML = `${two} ${funcao} ${one}`;
                        break;
                       
                }


                break;

            default:
                break;
        }

    });
});

document.querySelectorAll(".funcoes button").forEach(element => {
    element.addEventListener("click", (event) => {
        event.preventDefault();
        console.log(element.value);
    })
});


function set(valor) {
    funcao = valor;
    document.querySelector("#one").value = document.querySelector("#two").value + ` ${valor} `;
    document.querySelector("#two").value = "";
    document.querySelector("#two").setAttribute("placeholder", "0");
}

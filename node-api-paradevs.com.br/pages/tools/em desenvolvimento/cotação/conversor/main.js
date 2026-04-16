let valorReal = 0 , valorDolar = 0 , real = 0 , resultado = 0;

get().then((result) => {
    valorDolar = result.USDBRL.ask;
    document.querySelector("#resultado").value = parseFloat(result.USDBRL.ask).toLocaleString("en-US", { style: "currency" , currency:"USD"}); 

    document.querySelector("#valor").addEventListener("keyup" , (event) => {
        real = document.querySelector("#valor").value; 
        resultado = real  * valorDolar;
        document.querySelector("#resultado").value = parseFloat(resultado.toFixed(2)).toLocaleString("pt-BR", { style: "currency" , currency:"BRL"});
    });
    
}).catch((err) => {
    console.log(err);
});


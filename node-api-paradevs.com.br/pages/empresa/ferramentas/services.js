const main = {

    get: async function () {
        let response = await fetch('api.json');

        if (response.ok) { // if HTTP-status is 200-299
            // get the response body (the method explained below)
            let reponse = await response.json();
            return Promise.resolve(this.set(reponse));
        } else {
            return Promise.resolve(response.status);
        }

    },

    set: function (data) {

        data.forEach(element => {



            $("#root").append();

            // Cria as divs para cada solução
            element.nfe.forEach(serv => {
                console.log(serv)
                let result_element = `<div> <button id="exection" command='${JSON.stringify(element.service.command)}'>${element.service.title}</button> </div>`
                $("#root").append(result_element);
            });

            

        });


    },

    exection: function () {
        document.querySelectorAll("#exection").forEach(element => {
            element.addEventListener("click", () => {

                let attribute = element.getAttribute("command");
                let result_json = JSON.parse(attribute);
                websoocket_conection.set(result_json);

            })
        });
    }
}

const websoocket_conection = {
    set: function set(send) {
        console.log(send)
    }
}

main.get().then((result) => {
    console.log(result)
    main.exection();
}).catch((err) => {
    console.log(err)
});
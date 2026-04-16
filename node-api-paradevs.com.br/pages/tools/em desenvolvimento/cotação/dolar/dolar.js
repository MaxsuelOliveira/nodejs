async function get() {
    let response = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
        method : "GET"
    });

    if (response.ok) {
        return Promise.resolve(response.json());
    } else {
        return Promise.reject(response);
    }
}
let user = {
    'token': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
    'cnpj': '06990590000123',
    'plugin': 'RF'
};

let response = await fetch(url, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(user)
});

let result = await response.json();
alert(result.message);
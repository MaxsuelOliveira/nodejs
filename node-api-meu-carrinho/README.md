
# 🛒 Meu Carrinho

API RESTful para gerenciamento de carrinho de compras por usuário, utilizando Node.js, Express e SQLite. Cada usuário é identificado por um UUID único. O projeto é modular, simples e pronto para uso em qualquer aplicação de carrinho.

---


## 🚀 Funcionalidades

- Criar e gerenciar um carrinho por usuário (UUID)
- Adicionar item ao carrinho
- Listar todos os itens do carrinho
- Atualizar um item do carrinho
- Remover um item específico
- Esvaziar todo o carrinho
- Documentação automática via Swagger

---

## 🧱 Tecnologias

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [SQLite3](https://www.sqlite.org/index.html)
- [UUID](https://www.npmjs.com/package/uuid)
- [Swagger](https://swagger.io/) (documentação)

---


## 📁 Estrutura do Projeto

```
meu-carrinho/
├── controllers/
│   └── carrinho.controller.js      # Lógica das rotas
├── db/
│   └── database.js                 # Inicializa o banco e tabelas
├── models/
│   ├── carrinho.model.js           # CRUD dos itens do carrinho
│   └── usuario.model.js            # Gerencia usuários (uuid)
├── routes/
│   └── carrinho.routes.js          # Rotas da API REST
├── utils/
│   └── uuid.js                     # Utilitário para UUID
├── server.js                       # Ponto de entrada da API
├── swagger.js                      # Configuração do Swagger
├── package.json
├── postman-collection.json         # Coleção de testes para Postman
└── README.md
```

---

## 🛠️ Instalação

```bash
# Clone o projeto
git clone https://github.com/seu-usuario/api-minha-cestas.git
cd api-minha-cestas

# Instale as dependências
npm install

# Inicie o servidor
node server.js
# Acesse: http://localhost:3020
```

---


## 📖 Documentação Swagger

Acesse a documentação interativa em: [http://localhost:3020/api-docs](http://localhost:3020/api-docs)

---


## 📌 Rotas da API

### ➕ Adicionar item ao carrinho

`POST /carrinho/:uuid/adicionar`

```json
{
  "produto": "Feijão",
  "quantidade": 2,
  "valor_unitario": 7.99
}
```

### 📥 Listar itens do carrinho

`GET /carrinho/:uuid`

### ✏️ Atualizar item

`PUT /carrinho/:uuid/:id`

```json
{
  "produto": "Feijão Preto",
  "quantidade": 3,
  "valor_unitario": 8.49
}
```

### ❌ Remover item específico

`DELETE /carrinho/:uuid/:id`

### 🧹 Esvaziar todo o carrinho

`DELETE /carrinho/:uuid`

---


## 🧪 Testes rápidos com Postman

Importe o arquivo `postman-collection.json` no Postman para testar todas as rotas facilmente.

---


## 🧪 Exemplo de Teste com cURL

Adicionar item:

```bash
curl -X POST http://localhost:3020/carrinho/uuid123/adicionar \
  -H "Content-Type: application/json" \
  -d '{"produto":"Arroz","quantidade":1,"valor_unitario":5.99}'
```

Listar carrinho:

```bash
curl http://localhost:3020/carrinho/uuid123
```

---

## 📄 Licença

MIT



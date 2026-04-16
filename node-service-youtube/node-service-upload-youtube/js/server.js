const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const fse = require("fs-extra");

const db = require("./db");
const uploadVideo = require("./youtubeUploader");

const app = express();
const PORT = 3000;
const LOG_FILE = "./logs/server.log";
const upload = multer({ dest: "temp_uploads/" });

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

fse.ensureDirSync("./logs");

function log(msg) {
  const full = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, full);
  console.log(full);
}

// POST: Upload do vídeo
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const { titulo, descricao, setor, categoria } = req.body;
    const filePath = req.file.path;

    uploadVideo(filePath, titulo, descricao, async (videoUrl) => {
      fs.unlinkSync(filePath);

      const data_upload = new Date().toISOString();
      const sql = `INSERT INTO videos (hash, titulo, descricao, setor, categoria, data_upload)
                   VALUES (?, ?, ?, ?, ?, ?)`;

      db.run(
        sql,
        [videoUrl, titulo, descricao, setor, categoria, data_upload],
        function (err) {
          if (err) {
            log(`❌ Erro ao salvar no banco: ${err.message}`);
            return res
              .status(500)
              .json({ erro: "Erro ao salvar no banco de dados" });
          }

          log(`✅ Vídeo enviado | ID: ${this.lastID} | URL: ${videoUrl}`);
          res.json({ sucesso: true, id: this.lastID, url: videoUrl });
        }
      );
    });
  } catch (err) {
    log(`❌ Erro inesperado: ${err.message}`);
    res.status(500).json({ erro: "Erro durante o upload" });
  }
});

// GET: Listar vídeos com filtros e ordenação
app.get("/videos", (req, res) => {
  const {
    search,
    setor,
    categoria,
    page = 1,
    limit = 10,
    ordenarPor = "data_upload",
    ordem = "desc",
  } = req.query;
  const offset = (page - 1) * limit;

  let conditions = [];
  let values = [];

  if (search) {
    conditions.push("(titulo LIKE ? OR descricao LIKE ?)");
    values.push(`%${search}%`, `%${search}%`);
  }
  if (setor) {
    conditions.push("setor = ?");
    values.push(setor);
  }
  if (categoria) {
    conditions.push("categoria = ?");
    values.push(categoria);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = `ORDER BY ${ordenarPor} ${ordem.toUpperCase()}`;
  const pagination = `LIMIT ? OFFSET ?`;
  values.push(Number(limit), Number(offset));

  const sql = `SELECT * FROM videos ${where} ${orderBy} ${pagination}`;

  db.all(sql, values, (err, rows) => {
    if (err) {
      log(`❌ Erro ao buscar vídeos: ${err.message}`);
      return res.status(500).json({ erro: "Erro ao buscar vídeos" });
    }
    res.json(rows);
  });
});

// PUT: Atualizar um vídeo
app.put("/videos/:id", (req, res) => {
  const { id } = req.params;
  const { titulo, descricao, setor, categoria } = req.body;

  const sql = `UPDATE videos SET titulo = ?, descricao = ?, setor = ?, categoria = ? WHERE id = ?`;

  db.run(sql, [titulo, descricao, setor, categoria, id], function (err) {
    if (err) {
      log(`❌ Erro ao atualizar vídeo: ${err.message}`);
      return res.status(500).json({ erro: "Erro ao atualizar vídeo" });
    }
    res.json({ sucesso: true, alterado: this.changes });
  });
});

// DELETE: Remover um vídeo
app.delete("/videos/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM videos WHERE id = ?`, [id], function (err) {
    if (err) {
      log(`❌ Erro ao deletar vídeo: ${err.message}`);
      return res.status(500).json({ erro: "Erro ao deletar vídeo" });
    }

    res.json({ sucesso: true, removido: this.changes });
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
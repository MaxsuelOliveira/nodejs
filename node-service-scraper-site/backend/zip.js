const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

async function zipDirectory(sourceDir, zipFilePath) {
  await fs.promises.mkdir(path.dirname(zipFilePath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      resolve({
        zipPath: zipFilePath,
        bytes: archive.pointer()
      });
    });

    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

module.exports = { zipDirectory };

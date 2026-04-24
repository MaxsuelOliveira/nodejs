import os
import json
import argparse

# Gera template para arquivos JS
def template_js(name):
    return f"""// {name}

module.exports = {{
    // TODO: Implement {name}
}};
"""

def criar_estrutura(base, estrutura):
    os.makedirs(base, exist_ok=True)

    for pasta, arquivos in estrutura.items():
        if pasta == "root_files":
            for arquivo in arquivos:
                caminho_arquivo = os.path.join(base, arquivo)
                if not os.path.exists(caminho_arquivo):
                    with open(caminho_arquivo, "w") as f:
                        if arquivo.endswith(".js"):
                            f.write(template_js(arquivo))
                        else:
                            f.write("")
        else:
            dir_path = os.path.join(base, pasta)
            os.makedirs(dir_path, exist_ok=True)
            for arquivo in arquivos:
                caminho_arquivo = os.path.join(dir_path, arquivo)
                if not os.path.exists(caminho_arquivo):
                    with open(caminho_arquivo, "w") as f:
                        f.write(template_js(arquivo))

    print(f"Estrutura criada com sucesso em: {base}")

def main():
    parser = argparse.ArgumentParser(description="Gerador de Estrutura de Projeto")
    parser.add_argument("nome_projeto", help="Nome da pasta principal do projeto")
    parser.add_argument("-c", "--config", default="estrutura.json", help="Arquivo JSON com a estrutura (padrão: estrutura.json)")
    args = parser.parse_args()

    if not os.path.isfile(args.config):
        print(f"Arquivo de configuração '{args.config}' não encontrado.")
        return

    with open(args.config, "r") as f:
        estrutura = json.load(f)

    criar_estrutura(args.nome_projeto, estrutura)

if __name__ == "__main__":
    main()

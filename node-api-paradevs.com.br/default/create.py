import os
import os.path
import shutil
import json

path = "./tools"
categorias = os.listdir(path)
tipos = ["web", "js", "css", "node.js",
         "python", "php", "react.js", "electron"]


def main():
    name = input("Nome : ")
    print("-")

    print("Informe a categoria do projeto : ")
    for x, categoria in enumerate(categorias):
        print(f"{x}) - {categoria}")
    print("-")

    categorie = int(input("Catégoria : "))
    descricao = input("Descrição : ")
    print("-")

    for x, tipo in enumerate(tipos):
        print(f"{x} -> {tipo}")
    print("-")

    typeProjecto = int(input("Selecione o tipo do projeto : "))
    print("-")

    # start
    generator(name, categorie, typeProjecto)


# Copiando arquivos default conforme a tipo do projeto
def generator(name, categorie, typeProjecto):
    # Tramento de variaveis.
    categorie = categorias[categorie]
    typeProjecto = tipos[typeProjecto]

    getFiles(typeProjecto, categorie, name)


def getFiles(type, categorie, name):

    # Icone
    icon = input("icone : ")

    try:
        # case
        match type:

            case "web":

                # path to source directory
                src_dir = f'.\\default\\web'

                # path to destination directory
                dest_dir = f'tools\\{categorie}\\{name.replace(" ", "-")}'

                # getting all the files in the source directory
                files = os.listdir(src_dir)

                shutil.copytree(src_dir, dest_dir)

        setToolsjson(icon, name, categorie, dest_dir)

    except Exception as e:
        print("Não foi possível criar o projeto.\n", e)


# Personalizando arquivos default
def setFiles(type):
    print("Personalizando arquivos default")
    print("Projeto finalizado.")


# Adicionando informações ao tools.json  da pasta do projeto.
def setToolsjson(icon, name, categorie, dest):
    # ler o arquivo tools.json =>
    # tira o último ]
    # inserir o novo .json
    # coloca o ] de novo.

    file_add = "assets\\tools.json"

    dest = f"{dest}\\index.html".replace("\\", "/")

    save = {
        "active": True,
        "icone": icon,
        "descricao": name,
        "url": dest,
        "categoria": categorie
    }

    rem = "]"
    with open(file_add, 'r+') as f:
        l = f.readlines()
        l = [z for z in l if rem not in z]
    with open(file_add, 'w') as f:
        f.writelines(l)
    with open(file_add, 'a') as file:
        file.write("\n,")
        file.write(json.dumps(save))
        file.write("\n]")
    file.close()


main()

// Identificar o elemento/componente
const elemento = document.getElementById('meu-elemento');

// Capturar o valor inicial
const valorInicial = elemento.value;

// Função de verificação
function verificarMudanca() {
  // Comparar o valor atual com o valor inicial
  if (elemento.value !== valorInicial) {
    // Notificar via push
    // Você pode substituir esta parte com a lógica de notificação via push do serviço escolhido
    console.log('Valor mudou:', elemento.value);
  }
}

// Agendar a execução da função de verificação a cada 1 segundo
setInterval(verificarMudanca, 1000);
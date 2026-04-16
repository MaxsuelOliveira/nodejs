

function generateRandomInt(min, max) {
  return Math.floor((Math.random() * (max + 1 - min)) + min);
}

let resultado = document.querySelector("#numero");

let intervaloMax = document.querySelector("#max");
intervaloMax.addEventListener("change", (event) => {
  document.querySelector("[for='max']").innerText = intervaloMax.value;
});

let intervaloMin = document.querySelector("#min");
intervaloMin.addEventListener("change", (event) => {
  document.querySelector("[for='min']").innerText = intervaloMin.value;
});

let intervalovMax = document.querySelector("#vmax");
intervalovMax.addEventListener("change", (event) => {

  document.querySelectorAll("label").forEach(element => {
    element.innerText = 0;
  });

  intervaloMax.max = 0;
  intervaloMin.max = 0;

  intervaloMax.max = intervalovMax.value;
  intervaloMin.max = intervalovMax.value;

});

document.querySelector("#init").addEventListener("submit", (event) => {
  event.preventDefault();
 resultado.value = generateRandomInt(0,100);
})

document.querySelector(".modal form").addEventListener("submit", (event) => {
  event.preventDefault();
  console.log(generateRandomInt(
    intervaloMin.value,
    intervaloMax.value))
})

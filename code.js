const jsonNames = `["Subaru", "Otto", "Emilia", "Rem"]`;
const jsonString = JSON.stringify(jsonNames);
console.log(jsonString);
const parsedNames = JSON.parse(jsonNames);
console.log(parsedNames);

fetchData();

async function fetchData() {
  try {
    const pokemonName = document
      .getElementById("pokemonName")
      .value.toLowerCase();
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonName}`
    );
    if (!response.ok) {
      throw new Error("Could not fetch resource");
    }
    const data = await response.json();
    const pokemonSprite = data.sprites.front_default;
    const imageElement = document.getElementById("pokemonSprite");
    imageElement.src = pokemonSprite;
    imageElement.style.display = "block";
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

async function getPlayer(id) {}

const Producteur = require("./Producteur");
const Consommateur = require("./Consommateur");

const consA = new Consommateur(3, 3436);

consA.start().then(() => {
  console.log("ConsA est demarre");
});

const prodA = new Producteur(1, 3434);
const prodB = new Producteur(2, 3435);

prodA.start().then(() => {
  console.log("ProdA est demarre");
  prodA.link(3435);
});
prodB.start().then(() => {
  console.log("ProdB est demarre");
  prodB.link(3434);
});

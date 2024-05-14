const Producteur = require("./Producteur");
const Consommateur = require("./Consommateur");

const consA = new Consommateur(3, 3436);

consA.start().then(() => {
  console.log("ConsA est demarre");
});

const prodA = new Producteur(1, 3434);

prodA.link(consA);
prodA.start().then(() => {
  console.log("ProdA est demarre");
});

consA.addProd(3434);

const Producteur = require("./Producteur");
const Consommateur = require("./Consommateur");

const consA = new Consommateur(5, 3436);

consA.start().then(() => {
  console.log("ConsA est demarre");
});

const prodA = new Producteur(1, 3434);
const prodB = new Producteur(2, 3433);
const prodC = new Producteur(3, 3432);
const prodD = new Producteur(4, 3431);

prodA.link(consA);
prodA.link(prodC);

prodB.link(prodC);
prodB.link(prodD);

prodC.link(prodA);
prodC.link(prodB);

prodD.link(prodB);

prodA.start().then(() => {
  console.log("ProdA est demarre");
});
prodB.start().then(() => {
  console.log("ProdA est demarre");
});
prodC.start().then(() => {
  console.log("ProdA est demarre");
});
prodD.start().then(() => {
  console.log("ProdA est demarre");
});

consA.addProd(3434);
consA.addProd(3433);
consA.addProd(3432);
consA.addProd(3431);

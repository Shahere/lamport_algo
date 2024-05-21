const Producteur = require("./Producteur");
const Consommateur = require("./Consommateur");

const ressource = new SharedArrayBuffer(2)
const consA = new Consommateur(5, 3436, ressource);

consA.start().then(() => {
  console.log("ConsA est demarre");
});

const prodA = new Producteur(1, 3434);
const prodB = new Producteur(2, 3433);
const prodC = new Producteur(3, 3432);
const prodD = new Producteur(4, 3431);

prodA.link(consA, prodB, prodC, prodD);
prodB.link(consA, prodA, prodC, prodD);
prodC.link(consA, prodA, prodB, prodD);
prodD.link(consA, prodA, prodB, prodC);

prodA.start().then(() => {
  console.log("ProdA est demarre");
});
prodB.start().then(() => {
  console.log("ProdB est demarre");
});
prodC.start().then(() => {
  console.log("ProdC est demarre");
});
prodD.start().then(() => {
  console.log("ProdD est demarre");
});

consA.addProd(3434);
consA.addProd(3433);
consA.addProd(3432);
consA.addProd(3431);

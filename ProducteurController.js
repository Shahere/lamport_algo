const { parentPort, workerData, threadId } = require("worker_threads");
const express = require("express");
const {
  STATUS_IDLE,
  STATUS_STARTING,
  STATUS_RUNNING,
  MSG_INIT,
  MSG_LINK,
  MSG_REL,
  MSG_REQ,
  MSG_ACK,
} = require("./Constants");

class ProducteurController {
  /**
   *
   * @param {number} id Identifiant du producteur
   * @param {number} port Port de communication HTTP
   */
  constructor(id = threadId, port) {
    this.id = id;
    this.status = STATUS_IDLE;
    this.port = port;
    this.links = [];

    this.hl = 0;
    this.debprod = 0;
    this.finprod = 0;
    this.ifincons = 0;

    this.tab = new Map();

    this.req_en_cours = false;
    this.sc_en_cours = false;

    this.tab.set(this.port, [MSG_REL, 0]);
  }

  start() {
    if (this.status !== STATUS_IDLE) return;
    this.status = STATUS_STARTING;
    return new Promise((resolve, reject) => {
      const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));

      app.post("/msg", ({ body }, res) => {
        switch (body.type) {
          // Réception d'un message de type req
          case MSG_REQ:
            console.log(
              `${i} new request from ${body.i} (he: ${body.he} hl: ${this.hl})`
            );
            this.maj_h(body.he);
            hl++;
            this.sendTo(body.i, MSG_ACK);
            this.tab.set(this.port, [MSG_REQ, body.he]);
            break;
          default:
            break;
        }
        res.status(200);
      });

      app.listen(this.port, () => {
        this.status = STATUS_RUNNING;
        parentPort.postMessage(MSG_INIT);
        resolve();
      });
    });
  }

  /**
   * Etabli un tunnel de communication entre le port d'un controlleur passé en paramètre et le producteur
   * @param {number} port Port du controlleur
   */
  link(port) {
    if (this.links.includes(port)) return;
    this.links.push(port);
    this.tab.set(port, [MSG_REL, 0]);
    console.log(`${this.id} linked to port ${port}`);
  }

  /**
   * Diffuse un message à tout les controller connus
   * @param {string} msg Type du message à diffuser
   */
  diffuser(msg) {
    this.links.forEach((port) => {
      fetch(`http://127.0.0.1:${port}`, {
        method: "POST",
        body: {
          he: this.hl,
          i: this.port,
          type: msg,
        },
      });
    });
  }

  /**
   * Envoi un message à un controller spécifique
   * @param {number} port Port de destination
   * @param {string} msg Type du message à envoyer
   */
  sendTo(port, msg) {
    fetch(`http://127.0.0.1:${port}`, {
      method: "POST",
      body: {
        he: this.hl,
        i: this.port,
        type: msg,
      },
    });
  }

  /**
   * Met à jour l'horloge locale à la réception d'une date dans une estampille
   * @param {number} he Date de l'estampille
   */
  maj_h(he) {
    this.hl = Math.max(this.hl, he);
  }

  /**
   * Retourne le port du processus ayant la plus vieille date
   * @returns {number} Port du processus
   */
  plus_vieille_date() {
    let port_min = this.port;
    let date_min = this.tab.get(this.port)[1];

    this.tab.forEach((v, k) => {
      if (date_min > v[1]) {
        port_min = k;
        date_min = v[1];
      }
    });

    return port_min;
  }
}

const controller = new ProducteurController(workerData.id, workerData.port);

parentPort.on("message", (e) => {
  switch (e.type) {
    case MSG_LINK:
      controller.link(e.payload);
      break;
    default:
      break;
  }
});

controller.start().then(() => {
  console.log(
    `${controller.id} started http communication on port ${controller.port}`
  );
});

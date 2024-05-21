const { parentPort, workerData, threadId, Worker } = require("worker_threads");
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
  MSG_BESOIN_SC,
  MSG_MAJ,
  MSG_FIN_SC,
  MSG_DEB_SC,
} = require("./Constants");

const N = 1;

class ProducteurController {
  /**
   * Instancie un controlleur du producteur
   * @param {number} id Identifiant du producteur
   * @param {number} port Port de communication HTTP
   * @param {string} worker_src Chemin vers le fichier du worker de production
   */
  constructor(id = threadId, port, worker_src) {
    this.app = express();
    this.id = port;
    this.status = STATUS_IDLE;
    this.port = port;
    this.id_consommateur = null;
    this.links = [];

    this.hl = 0;
    this.debprod = 0;
    this.finprod = 0;
    this.ifincons = 0;

    this.tab = new Map();

    this.req_en_cours = false;
    this.sc_en_cours = false;

    this.updateTab(this.port, MSG_REL, 0);

    this.worker_src = worker_src;
    this.worker = null;
  }

  /**
   * Vérifie si la section critique peut être donné au producteur
   */
  checkSc() {
    if (!this.req_en_cours || this.sc_en_cours) return;
    if (this.debprod - this.ifincons >= N) return;
    if (this.plus_vieille_date() !== this.port) return;
    console.log(`${this.id} accès à la sc autorisé`);
    this.sc_en_cours = true;
    this.debprod++;
    this.worker.postMessage(MSG_DEB_SC);
  }

  /**
   * Met à jour le tableau de messages pour le contrôleur spécifié
   * @param {number} port Port du contrôleur
   * @param {string} msg Type du message
   * @param {number} hl Horloge du contrôleur
   */
  updateTab(port, msg, hl) {
    this.tab.set(port, [msg, hl]);
    this.checkSc();
  }

  /**
   * Démarre le worker de production ainsi que le serveur HTTP du conrolleur
   * @returns {Promise<void>} Résolu quand le serveur est démarré
   */
  start() {
    if (this.status !== STATUS_IDLE) return;
    this.status = STATUS_STARTING;
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    return new Promise((resolve, reject) => {
      /**
       * Gère les messages échangés avec les autres contrôlleurs
       */
      this.app.post("/msg", (req, res) => {
        console.log(
          `${this.id} new request from ${req.body.i} (he: ${req.body.he} hl: ${this.hl})`
        );
        if (!req.body.type) return;
        switch (req.body.type) {
          // Réception d'un message de type req
          case MSG_REQ:
            this.maj_h(req.body.he);
            this.hl++;
            this.sendTo(req.body.i, MSG_ACK);
            this.updateTab(this.port, MSG_REQ, req.body.he);
            break;
          // Réception d'un message de type ack
          case MSG_ACK:
            this.maj_h(req.body.he);
            if (this.tab.get(req.body.i)[0] !== MSG_REQ) {
              this.updateTab(req.body.i, MSG_ACK, req.body.he);
            }
            break;
          // Réception d'un message de type rel
          case MSG_REL:
            this.maj_h(req.body.he);
            this.updateTab(this.port, MSG_REL, req.body.he);
            this.debprod++;
            this.checkSc();
            this.finprod++;
            break;
          // Réception d'un message de type maj
          case MSG_MAJ:
            this.ifincons = req.body.ifincons;
            this.checkSc();
            break;
          default:
            break;
        }
        res.status(200);
      });

      this.app.listen(this.port, () => {
        this.status = STATUS_RUNNING;
        parentPort.postMessage(MSG_INIT);
        this.startWorker();
        resolve();
      });
    });
  }

  /**
   * Démarre le worker de production
   */
  startWorker() {
    this.worker = new Worker(this.worker_src);

    /**
     * Gère les messages échangés avec le worker producteur
     */
    this.worker.on("message", (e) => {
      switch (e) {
        // Acquisition
        case MSG_BESOIN_SC:
          console.log(`${this.id} received besoin_sc`);
          this.acquisition();
          break;
        // Liberation
        case MSG_FIN_SC:
          console.log(`${this.id} received fin_sc`);
          this.libere();
          break;
        default:
          break;
      }
    });
  }

  /**
   * Etabli un tunnel de communication entre le port d'un controlleur passé en paramètre et le producteur
   * @param {number} port Port du controlleur
   * @param {boolean} [is_consommateur=false] Doit valoir true si c'est un consommateur
   */
  link(port, is_consommateur = false) {
    if (!this.id_consommateur && is_consommateur === true) {
      this.id_consommateur = port;
      console.log(`${this.id} linked to consommateur ${port}`);
      return;
    }
    if (is_consommateur) return;
    if (this.links.includes(port)) return;
    this.links.push(port);
    this.updateTab(port, MSG_REL, 0);
    console.log(`${this.id} linked to port ${port}`);
  }

  /**
   * Demande l'accès à la section critique
   */
  acquisition() {
    console.log(`${this.id} demande la sc`);
    if (this.req_en_cours) return;
    this.hl++;
    this.req_en_cours = true;
    this.checkSc();
    this.diffuser(MSG_REQ);
    this.updateTab(this.port, MSG_REQ, this.hl);
  }

  /**
   * Libère la section critique à la fin de l'accès par le producteur
   */
  libere() {
    if (!this.req_en_cours || !this.sc_en_cours) return;
    this.sc_en_cours = false;
    this.req_en_cours = false;
    this.finprod++;
    // Envoi le message MSG_MAJ au consommateur
    this.sendTo(this.id_consommateur, MSG_MAJ, {
      ifinprod: this.finprod,
    });
    this.hl++;
    this.diffuser(MSG_REL);
    this.updateTab(this.port, MSG_REL, this.hl);
    console.log(`${this.id} libere la sc`);
  }

  /**
   * Diffuse un message à tout les controller connus
   * @param {string} type Type du message à diffuser
   */
  diffuser(type) {
    console.log(`${this.id} broadcast ${type}`);
    this.links
      .filter((p) => p !== this.port)
      .forEach((port) => {
        fetch(`http://127.0.0.1:${port}/msg`, {
          method: "POST",
          headers: new Headers({ "content-type": "application/json" }),
          body: JSON.stringify({
            he: this.hl,
            i: this.port,
            type: type,
          }),
        });
      });
  }

  /**
   * Envoi un message à un controller spécifique
   * @param {number} port Port de destination
   * @param {string} type Type du message à envoyer
   * @param {any} [payload=undefined] Contenu additionnel
   */
  sendTo(port, type, payload = undefined) {
    console.log(`${this.id} send ${type} to ${port}`);
    fetch(`http://127.0.0.1:${port}/msg`, {
      method: "POST",
      headers: new Headers({ "content-type": "application/json" }),
      body: JSON.stringify({
        he: this.hl,
        i: this.port,
        type: type,
        payload: payload,
      }),
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
   * @returns {number} Port du processus ayant la plus vieille date
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

const controller = new ProducteurController(
  workerData.id,
  workerData.port,
  "./DummyProducteur.js"
);

/**
 * Gère les messages échangés avec le thread principal
 */
parentPort.on("message", (e) => {
  switch (e.type) {
    case MSG_LINK:
      controller.link(e.payload.port, e.payload.consommateur);
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

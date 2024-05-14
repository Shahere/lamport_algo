const {
  STATUS_IDLE,
  STATUS_STARTING,
  STATUS_RUNNING,
  MSG_INIT,
  MSG_LINK,
  MSG_BESOIN_SC,
  MSG_FIN_SC,
  MSG_MAJ,
  MSG_DEB_SC,
} = require("./Constants.js");
const express = require("express");
const { parentPort, threadId, workerData, Worker } = require("worker_threads");

class ConsommateurController {
  constructor(id, port, worker_url) {
    this.id = port;
    this.status = STATUS_IDLE;
    this.port = port;
    this.producteurs = [];
    this.worker = null;
    this.worker_url = worker_url;

    this.debcons = 0;
    this.fincons = 0;
    this.ifinprod = 0;

    this.req_en_cours = false;
    this.sc_en_cours = false;
  }

  checkSc() {
    if (
      !this.sc_en_cours &&
      this.req_en_cours &&
      this.debcons - this.ifinprod < 0
    ) {
      console.log("accès à la sc autorisé");
      this.debcons = this.debcons + 1;
      this.worker.postMessage(MSG_DEB_SC);
      this.sc_en_cours = true;
    }
  }

  start() {
    if (this.status !== STATUS_IDLE) return;
    this.status = STATUS_STARTING;
    return new Promise((resolve, reject) => {
      const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));

      app.get("/", (req, res) => {
        res.send("Hello World!");
      });

      app.post("/msg", (req, res) => {
        console.log(`${this.id} received}`, req.body);
        switch (req.body.type) {
          case MSG_MAJ:
            console.log(
              `${this.id} met à jour ifinprod (=${req.body.payload.ifinprod})`
            );
            //MIse a jour
            this.ifinprod = req.body.payload.ifinprod;
            this.checkSc();
            break;
          default:
            break;
        }
        res.end();
      });

      app.listen(this.port, () => {
        this.status = STATUS_RUNNING;
        parentPort.postMessage(MSG_INIT);
        this.startWorker();
        resolve();
      });
    });
  }

  startWorker() {
    this.worker = new Worker(this.worker_url);

    this.worker.on("message", (e) => {
      switch (e) {
        // ACQUISITION
        case MSG_BESOIN_SC:
          console.log("Consommateur demande de SC");
          this.besoin_sc();
          break;
        //LIBERATION
        case MSG_FIN_SC:
          console.log("Consommateur fin de SC");
          this.fin_sc();
          break;
        default:
          break;
      }
    });
  }

  diffuser(msg) {
    this.producteurs
      .filter((p) => p !== this.port)
      .forEach((port) => {
        fetch(`http://127.0.0.1:${port}/msg`, {
          method: "POST",
          headers: new Headers({ "content-type": "application/json" }),
          body: JSON.stringify({
            ifincons: this.fincons,
            type: msg,
          }),
        });
      });
  }

  addProducteur(id) {
    if (this.producteurs.includes(id)) return;
    this.producteurs.push(id);
    console.log(`${this.id} add to port ${id}`);
  }

  besoin_sc() {
    if (this.req_en_cours) return;
    console.log(`${this.id} demande de la sc`);
    //Verifier "id" du producteur qui envoi la demande ?
    this.req_en_cours = true;
    this.checkSc();
  }

  fin_sc() {
    console.log(`${this.id} fin de la sc`);
    if (!this.req_en_cours || !this.sc_en_cours) return;
    this.fincons = this.fincons + 1;

    //on doit envoyer a tous les producteur la MAJ de fincons
    this.diffuser(MSG_MAJ);

    this.sc_en_cours = false;
    this.req_en_cours = false;
    this.checkSc();
  }
}

const controller = new ConsommateurController(
  threadId,
  workerData.port,
  "./DummyConsommateur.js"
);

parentPort.on("message", (e) => {
  switch (e.type) {
    case MSG_LINK:
      controller.addProducteur(e.payload);
      break;
    default:
      break;
  }
});

controller.start().then(() => {
  console.log(`${controller.id} start on port ${controller.port}`);
});

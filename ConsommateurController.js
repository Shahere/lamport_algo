const {
  STATUS_IDLE,
  STATUS_STARTING,
  STATUS_RUNNING,
  MSG_INIT,
  MSG_LINK,
  MSG_BESOIN_SC,
  MSG_FIN_SC,
} = require("./Constants.js");
const express = require("express");
const { parentPort, threadId, workerData, Worker } = require("worker_threads");

const CHECK_SC_MANAGER = {
  set: (target, _, val) => {
    target = val;
    this.checkSc();
  },
};

class ConsommateurController {
  constructor(id, port, worker) {
    this.id = id;
    this.status = STATUS_IDLE;
    this.port = port;
    this.producteurs = [];
    this.worker = new Worker(worker);

    this.debcons = 0;
    this.fincons = 0;
    this.ifinprod = 0;

    this.req_en_cours = new Proxy(
      {
        selected: false,
      },
      {
        CHECK_SC_MANAGER,
      }
    );
    this.sc_en_cours = new Proxy(
      {
        selected: false,
      },
      {
        CHECK_SC_MANAGER,
      }
    );
  }

  checkSc() {
    if (
      !this.sc_en_cours &&
      this.req_en_cours &&
      this.debcons - this.ifinprod < 0
    ) {
      this.debcons = this.debcons + 1;
      this.worker.postMessage(MSG_DEB_SC);
      this.sc_en_cours = vrai;
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
        console.log(`${this.id} received ${req.body}`);
        switch (req.body.type) {
          case MSG_MAJ:
            //MIse a jour
            this.ifinprod = req.body.ifinprod;
            break;
          default:
            break;
        }
        res.end();
      });

      app.listen(this.port, () => {
        this.status = STATUS_RUNNING;
        parentPort.postMessage(MSG_INIT);
        resolve();
      });
    });
  }

  diffuser(msg) {
    this.producteurs
      .filter((p) => p !== this.port)
      .forEach((port) => {
        fetch(`http://127.0.0.1:${port}/msg`, {
          method: "POST",
          body: {
            ifincons: this.fincons,
            type: msg,
          },
        });
      });
  }

  addProducteur(id) {
    if (this.producteurs.includes(id)) return;
    this.producteurs.push(id);
    console.log(`${this.id} add to port ${id}`);
  }

  besoin_sc() {
    //Verifier "id" du producteur qui envoi la demande ?
    this.req_en_cours = true;
  }

  fin_sc() {
    if (!this.req_en_cours || !this.sc_en_cours) return;
    this.fincons = this.fincons + 1;
    let k = 1;

    //on doit envoyer a tous les producteur la MAJ de fincons
    this.diffuser(MSG_MAJ);

    this.sc_en_cours = false;
    this.req_en_cours = false;
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

controller.worker.on("message", (e) => {
  switch (e) {
    // ACQUISITION
    case MSG_BESOIN_SC:
      console.log("Consommateur demande de SC");
      controller.besoin_sc();
      break;
    //LIBERATION
    case MSG_FIN_SC:
      console.log("Consommateur fin de SC");
      controller.fin_sc();
      break;
    default:
      break;
  }
});

controller.start().then(() => {
  console.log(`${controller.id} start on port ${controller.port}`);
});

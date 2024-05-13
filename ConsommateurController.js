const {
  STATUS_IDLE,
  STATUS_STARTING,
  STATUS_RUNNING,
  MSG_INIT,
  MSG_LINK,
} = require("./Constants.js");
const express = require("express");
const { parentPort, threadId, workerData } = require("worker_threads");

class ConsommateurController {
  constructor(id, port) {
    this.id = id;
    this.status = STATUS_IDLE;
    this.port = port;
    this.links = [];

    this.debcons = 0;
    this.fincons = 0;
    this.ifinprod = 0;

    this.req_en_cours = false;
    this.sc_en_cours = false;
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
        console.log("${this.id} received ${req.body}");
        res.end();
      });

      app.listen(this.port, () => {
        this.status = STATUS_RUNNING;
        parentPort.postMessage(MSG_INIT);
        resolve();
      });
    });
  }

  link(id) {
    if (this.links.includes(id)) return;
    this.links.push(id);
    console.log("${this.id} linked to port ${id}");
  }

  besoin_sc() {
    //Verifier "id" du producteur qui envoi la demande ?
    this.req_en_cours = true;
  }

  fin_sc() {
    if (!this.req_en_cours || !this.sc_en_cours) return;
    this.fincons = this.fincons + 1;
    let k = 1;

    this.sc_en_cours = false;
    this.req_en_cours = false;
  }
}

const controller = new ConsommateurController(threadId, workerData.port);

parentPort.on("message", (e) => {
  console.log(e.payload);
});

controller.start().then(() => {
  console.log(`${controller.id} start on port ${controller.port}`);
});

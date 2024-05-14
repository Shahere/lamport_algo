const { Worker } = require("worker_threads");
const { MSG_LINK } = require("./Constants");

class Consommateur {
  constructor(id, port) {
    this.id = id;
    this.port = port;
    this.worker = new Worker("./ConsommateurController.js", {
      workerData: {
        id: this.id,
        port: this.port,
      },
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      const action = (e) => {
        console.log(`receive message from ${e}`);
        resolve();
      };
      this.worker.on("message", action);
    });
  }

  addProd(port) {
    this.worker.postMessage({
      type: MSG_LINK,
      payload: port,
    });
  }
}

module.exports = Consommateur;

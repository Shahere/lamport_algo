const { Worker } = require("worker_threads");
const { MSG_LINK } = require("./Constants");

class Consommateur {
  /**
   * 
   * @param {*} id 
   * @param {*} port 
   */
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

  /**
   * Start a consumer
   * @returns Promise good achievement
   */
  start() {
    return new Promise((resolve, reject) => {
      const action = (e) => {
        console.log(`receive message from ${e}`);
        resolve();
      };
      this.worker.on("message", action);
    });
  }

  /**
   * Add a producteur to consumer known list
   * @param {*} port 
   */
  addProd(port) {
    this.worker.postMessage({
      type: MSG_LINK,
      payload: port,
    });
  }
}

module.exports = Consommateur;

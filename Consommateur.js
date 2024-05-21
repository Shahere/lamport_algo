const { Worker } = require("worker_threads");
const { MSG_LINK } = require("./Constants");

class Consommateur {
  /**
   * 
   * @param {number} id ID du consommateur
   * @param {number} port PORT du consommateur
   * @param {SharedArrayBuffer} [ressource=null] Ressource partagé
   */
  constructor(id, port, ressource=null) {
    this.id = id;
    this.port = port;
    this.sharedArrayBuffer = ressource;
    this.worker = new Worker("./ConsommateurController.js", {
      workerData: {
        id: this.id,
        port: this.port,
        ressource: this.sharedArrayBuffer
      },
    });
  }

  /**
   * Start a consumer
   * @returns {Promise<void>}
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
   * @param {number} port 
   */
  addProd(port) {
    this.worker.postMessage({
      type: MSG_LINK,
      payload: port,
    });
  }
}

module.exports = Consommateur;

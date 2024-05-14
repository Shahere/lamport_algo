const { Worker } = require("worker_threads");
const { MSG_LINK } = require("./Constants");
const Consommateur = require("./Consommateur");

class Producteur {
  /**
   *
   * @param {number} id
   * @param {number} port
   */
  constructor(id, port) {
    this.id = id;
    this.port = port;
    this.worker = new Worker("./ProducteurController.js", {
      workerData: {
        id: this.id,
        port: this.port,
      },
    });
  }

  /**
   * Démarre un producteur
   */
  start() {
    return new Promise((resolve, reject) => {
      const action = (e) => {
        console.log(`received message ${e}`);
        resolve();
      };
      this.worker.on("message", action);
    });
  }

  /**
   * Etabli un tunnel de communication entre le port d'un controlleur passé en paramètre et le producteur
   * @param {Producteur | Consommateur} controller Controller d'un producteur ou consommateur
   */
  link(controller) {
    this.worker.postMessage({
      type: MSG_LINK,
      payload: {
        port: controller.port,
        consommateur: controller instanceof Consommateur,
      },
    });
  }
}

module.exports = Producteur;

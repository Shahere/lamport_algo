const { parentPort, workerData } = require("worker_threads");
const { MSG_BESOIN_SC, MSG_DEB_SC, MSG_FIN_SC } = require("./Constants");

const old = console.log;
const ressource = workerData.ressource;

console.log = (...args) => {
  old("[DummyConsommateur] " + args);
};

/**
 * Dummy consumer ask for critical section
 * @returns {Promise<void>} 
 */
function ask() {
  console.log("Demande la section critique");
  return new Promise((resolve, reject) => {
    parentPort.postMessage(MSG_BESOIN_SC);
    parentPort.on("message", (e) => {
      if (e !== MSG_DEB_SC) return;
      resolve();
    });
  });
}

/**
 * Free the critical section
 */
function free() {
  console.log("Libère la section critique");
  parentPort.postMessage(MSG_FIN_SC);
}

/**
 * Run the Dummy worker
 */
async function run() {
  await ask();
  console.log("doing some stuff...");
  console.log(`Ressource at 0 ${ressource[0]} at 1 ${ressource[1]}`)
  setTimeout(() => {
    free();
    setTimeout(() => {
      run();
    }, Math.floor(Math.random() * 10000));
  }, Math.floor(Math.random() * 10000));
}

run();

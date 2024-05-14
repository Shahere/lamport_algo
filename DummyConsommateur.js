const { parentPort } = require("worker_threads");
const { MSG_BESOIN_SC, MSG_DEB_SC, MSG_FIN_SC } = require("./Constants");

const old = console.log;

console.log = (...args) => {
  old("[DummyConsommateur] " + args);
};

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

function free() {
  console.log("Libère la section critique");
  parentPort.postMessage(MSG_FIN_SC);
}

async function run() {
  await ask();
  console.log("doing some stuff...");
  setTimeout(() => {
    free();
    setTimeout(() => {
      run();
    }, Math.floor(Math.random() * 10000));
  }, Math.floor(Math.random() * 10000));
}

run();

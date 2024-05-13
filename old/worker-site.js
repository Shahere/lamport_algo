const { parentPort, workerData } = require("worker_threads");

const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const id = workerData.id;
const hostIP = workerData.hostIP;
const hostname = workerData.hostname;
const HTTPport = workerData.HTTPport;
const HTTPchildPort = workerData.HTTPchildPort;

//Machine d'état Demandeur / Dehors / Dedans
let status = "dehors";

app.post("/token", (req, res) => {
  const token = req.body;
  tokenReceived(token);
  res.status(200).send({ message: "received token" });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(HTTPport, () => {
  console.log(
    `Worker Site number ${id} is running on http://${hostname}:${HTTPport}`
  );
  parentPort.postMessage("init");
});

async function start() {
  await cruise();
  await start();
}

async function tokenReceived(token) {
  switch (status) {
    case "demandeur":
      console.log(`${id} :token received while 'demandeur' : begins crossing`);

      status = "dedans";
      await cross(token);
      await sendToken(token);
      status = "dehors";
      break;
    case "dedans":
      console.log(`token received while "dedans" : cant be`);
      break;
    case "dehors":
      console.log(`${id} :token received while 'dehors' : just pass it`);
      await sendToken(token);
      break;
    default:
      console.log("unknown state");
  }
}

async function cross() {
  const deb = new Date();
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
      const end = new Date();
      console.log(
        `${
          workerData.id
        } has crossed between ${deb.getHours()}:${deb.getMinutes()}:${deb.getSeconds()}:${deb.getMilliseconds()} and ${end.getHours()}:${end.getMinutes()}:${end.getSeconds()}:${end.getMilliseconds()}`
      );
    }, Math.floor(Math.random() * 10000));
  });
}

async function cruise() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
      console.log(`\t \t ${workerData.id} has arrived to the crossing`);
      status = "demandeur";
    }, Math.floor(Math.random() * 5000));
  });
}

async function sendToken(token) {
  const response = await fetch(`http://${hostname}:${HTTPchildPort}/token`, {
    method: "post",
    body: JSON.stringify(token),
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  console.log(`${id} (${HTTPport}) has just send a token to ${HTTPchildPort} `);
}

start();

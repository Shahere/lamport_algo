const { Worker, workerData } = require('worker_threads');
const os = require('os');
const hostname = "127.0.0.1";


class myWorker{
  constructor({id,hostname,HTTPport,HTTPchildPort, sharedBuffer}){
    this.id = id;
    this.hostname = hostname;
    this.HTTPport = HTTPport;
    this.HTTPchildPort = HTTPchildPort;
    this.worker = undefined;
    this.sharedBuffer = sharedBuffer
  }
  async init(){
    this.worker =  new Worker( `${__dirname}/worker-site.js`, {workerData: {id:this.id,  hostname:this.hostname, HTTPport:this.HTTPport, HTTPchildPort:this.HTTPchildPort, sharedBuffer:this.sharedBuffer}} );
    
    return new Promise((resolve,reject)=>{
      this.worker.on('message', 
        (msg) => { 
          if (msg !== "init") return;
         resolve(`worker ${this.id} is online`);
        })
    })
  }
}


class RingOfWorkers extends Array {
  constructor({numberOfWorkers, hostname, startPort}) {
      super();
      this.numberOfWorkers = numberOfWorkers;
      this.hostname = hostname;
      this.startPort = startPort;
      this.shareBuffer = new SharedArrayBuffer(2);

      let HTTPport = this.startPort;
      let HTTPchildPort = this.startPort;
      for(let id=0;  id<this.numberOfWorkers ; id++){
        HTTPport = this.startPort + id;
        if(id == this.numberOfWorkers-1){
          HTTPchildPort = this.startPort;
        }else{
          HTTPchildPort = HTTPport+1;
        }
        const theWorker = new myWorker({id,hostname:this.hostname,HTTPport,HTTPchildPort, sharedBuffer:this.shareBuffer})
        this.push(theWorker);

      }
  }

  async init(){
    const sitesPromises = new Array();
    this.forEach((site)=>{sitesPromises.push(site.init())})
    Promise.all(sitesPromises).then(()=>{this.launch()})
    setTimeout(()=>{this.harakiri()}, 100000);
  }

  harakiri(){
    this.forEach((site)=>{site.terminate()});
  }

  
  async launch(){
    const token = {
      type:'token',
      payload:{
        cpt:0
      }
    }

    fetch(
      `http://${this.hostname}:${this.startPort}/token`,
      {
          method: 'post',
          body: JSON.stringify(token),
          headers: {'Content-Type': 'application/json'}
      }
    )
    .then((data)=>{
      return data.json()
    })
    .then((respons)=>{
      console.log(`main has just send a token to ${this.startPort}`);
    })

  }



}


const myRingOfWorkers = new RingOfWorkers({numberOfWorkers:1,hostname, startPort:3000});
myRingOfWorkers.init().then(()=>{console.log(`done`)})



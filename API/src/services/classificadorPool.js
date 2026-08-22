// src/services/classificadorPool.js
const { PythonShell } = require('python-shell');
const path = require('path');

class ClassificadorPool {
    constructor(poolSize = 3) {
        this.poolSize = poolSize;
        this.available = [];
        this.busy = [];
        this.queue = [];
        this.scriptPath = path.join(__dirname, '..', 'ia');
        this.scriptName = 'classificadorUrgencia.py';
        
        // Inicializar pool
        this.initPool();
    }

    async initPool() {
        console.log(`🚀 Inicializando pool com ${this.poolSize} workers...`);
        
        for (let i = 0; i < this.poolSize; i++) {
            await this.createWorker(i);
        }
        
        console.log(`✅ Pool inicializado. Workers disponíveis: ${this.available.length}`);
    }

    createWorker(workerId) {
        return new Promise((resolve, reject) => {
            const options = {
                mode: 'text',
                pythonPath: process.env.PYTHON, //'python'
                pythonOptions: ['-u'],
                scriptPath: this.scriptPath,
                args: []
            };
            
            const worker = new PythonShell(this.scriptName, options);
            worker.workerId = workerId;
            worker.busy = false;
            
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout ao inicializar worker ${workerId}`));
            }, 20000);
            
            worker.once('message', (message) => {
                clearTimeout(timeout);
                console.log(`✅ Worker ${workerId} inicializado`);
                worker.busy = false;
                this.available.push(worker);
                resolve(worker);
            });
            
            worker.once('error', (err) => {
                clearTimeout(timeout);
                console.error(`❌ Erro no worker ${workerId}:`, err);
                reject(err);
            });
        });
    }

    async classificar(dadosChamado) {
        console.log(`📊 Classificando chamado...`);
        
        return new Promise((resolve, reject) => {
            const task = { dadosChamado, resolve, reject };
            
            const timeout = setTimeout(() => {
                reject(new Error('Timeout na classificação (30 segundos)'));
            }, 30000);
            task.timeout = timeout;
            
            if (this.available.length > 0) {
                const worker = this.available.pop();
                this.executeTask(worker, task);
            } else if (this.busy.length < this.poolSize) {
                this.createWorker(this.busy.length + this.available.length)
                    .then(worker => {
                        this.executeTask(worker, task);
                    })
                    .catch(reject);
            } else {
                console.log(`⏳ Todos workers ocupados. Task na fila: ${this.queue.length + 1}`);
                this.queue.push(task);
            }
        });
    }

    executeTask(worker, task) {
        worker.busy = true;
        this.busy.push(worker);
        
        console.log(`🔨 Executando task no worker ${worker.workerId}`);
        
        const dadosStr = JSON.stringify(task.dadosChamado);
        worker.send(dadosStr);
        
        const messageHandler = (message) => {
            clearTimeout(task.timeout);
            
            try {
                const result = JSON.parse(message);
                console.log(`✅ Worker ${worker.workerId} retornou:`, result);
                
                if (result.error) {
                    task.reject(new Error(result.error));
                } else {
                    task.resolve(result);
                }
            } catch (e) {
                console.error(`❌ Erro ao parsear JSON:`, message);
                task.reject(new Error(`Erro ao processar resposta: ${e.message}`));
            }
            
            worker.off('message', messageHandler);
            worker.off('error', errorHandler);
            
            this.releaseWorker(worker);
        };
        
        const errorHandler = (err) => {
            clearTimeout(task.timeout);
            console.error(`❌ Erro no worker ${worker.workerId}:`, err);
            task.reject(err);
            
            worker.off('message', messageHandler);
            worker.off('error', errorHandler);
            
            this.removeWorker(worker);
        };
        
        worker.once('message', messageHandler);
        worker.once('error', errorHandler);
    }

    releaseWorker(worker) {
        const index = this.busy.indexOf(worker);
        if (index > -1) {
            this.busy.splice(index, 1);
        }
        
        worker.busy = false;
        
        if (worker.childProcess && !worker.childProcess.killed) {
            this.available.push(worker);
            console.log(`🔄 Worker ${worker.workerId} liberado. Disponível: ${this.available.length}`);
        } else {
            console.log(`⚠️ Worker ${worker.workerId} não está saudável, criando novo...`);
            this.createWorker(worker.workerId).catch(console.error);
        }
        
        if (this.queue.length > 0 && this.available.length > 0) {
            const nextTask = this.queue.shift();
            const nextWorker = this.available.pop();
            this.executeTask(nextWorker, nextTask);
        }
    }

    removeWorker(worker) {
        const busyIndex = this.busy.indexOf(worker);
        if (busyIndex > -1) {
            this.busy.splice(busyIndex, 1);
        }
        
        const availIndex = this.available.indexOf(worker);
        if (availIndex > -1) {
            this.available.splice(availIndex, 1);
        }
        
        try {
            worker.end();
        } catch (e) {
            console.error(`Erro ao finalizar worker:`, e);
        }
        
        console.log(`🔄 Recriando worker para manter pool size...`);
        this.createWorker(worker.workerId).catch(console.error);
    }
}

module.exports = ClassificadorPool;
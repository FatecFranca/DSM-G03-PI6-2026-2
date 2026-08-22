// src/services/classificador.js
const ClassificadorPool = require('./classificadorPool');

// Criar instância única do pool
const pool = new ClassificadorPool(2);

module.exports = pool;
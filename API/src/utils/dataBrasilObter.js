// src/utils/dataBrasilObter.js
// CommonJS version
function getBrasilDateTime() {
    const now = new Date();
    // Subtrair 3 horas (3 * 60 * 60 * 1000 = 10800000 milissegundos)
    now.setHours(now.getHours() - 3);
    return now;
}

module.exports = { getBrasilDateTime };
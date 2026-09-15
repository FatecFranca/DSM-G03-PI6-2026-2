// src/services/classificadorService.js
const { classificadorRabbitMQ } = require('./classificadorRabbitMQ');
const prisma = require('../prisma.js');

// Inicializar o RabbitMQ
classificadorRabbitMQ.init().catch(console.error);


// Processa classificação em background usando RabbitMQ
async function processarClassificacaoEmBackground(chamadoId, dadosClassificacao) {
    console.log(`[${new Date().toISOString()}] 🚀 Enviando chamado ${chamadoId} para classificação...`);
    console.log('Dados:', dadosClassificacao);

    try {
        // Enviar para fila (não espera resultado)
        const resultado = await classificadorRabbitMQ.classificar(chamadoId, dadosClassificacao);
        
        // Se o resultado for um objeto com status 'enfileirado', significa que foi enviado com sucesso
        if (resultado && resultado.status === 'enfileirado') {
            return true;
        }
        
        return false;

    } catch (error) {
        console.error(`❌ Erro ao enviar chamado ${chamadoId} para classificação:`, error);
        return false;
    }
}


module.exports = {
    processarClassificacaoEmBackground
};
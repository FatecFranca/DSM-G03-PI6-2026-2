const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error']
})

// Teste de conexão ao iniciar
prisma.$connect()
  .then(() => console.log('✅ Conectado ao banco de dados'))
  .catch(err => {
    console.error('❌ Erro ao conectar ao banco:', err)
    process.exit(1)
  })

// Desconectar ao encerrar
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

module.exports = prisma
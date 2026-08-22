const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const app = express()

// Middlewares
app.use(helmet()) // Segurança
app.use(cors()) // CORS
app.use(morgan('dev')) // Logging
app.use(express.json()) // Parsing JSON
app.use(express.urlencoded({ extended: true }))

// Rota de saúde
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'API Cortes Top',
  })
})

// 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

module.exports = app
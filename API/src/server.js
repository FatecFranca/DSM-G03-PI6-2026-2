// server.js
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN?.split(',');

const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));


// Middleware para cookies
app.use(cookieParser());

const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const adminRouter = require('./routes/adminRouter');
const unidadeRouter = require('./routes/unidadeRouter');
const gestorRouter = require('./routes/gestorRouter');
const departamentoRouter = require('./routes/departamentoRouter');
const pessoaRouter = require('./routes/pessoaRouter');
const tecnicoRouter = require('./routes/tecnicoRouter');
const equipeRouter = require('./routes/equipeRouter');
const tipoSuporteRouter = require('./routes/tipoSuporteRouter');
const chamadoRouter = require('./routes/chamadoRouter');
const atividadeChamadoRouter = require('./routes/atividadeChamadoRouter');

app.use('/api/admin', adminRouter);
app.use('/api/unidade', unidadeRouter);
app.use('/api/gestor', gestorRouter);
app.use('/api/departamento', departamentoRouter);
app.use('/api/pessoa', pessoaRouter);
app.use('/api/tecnico', tecnicoRouter);
app.use('/api/equipe', equipeRouter);
app.use('/api/tiposuporte', tipoSuporteRouter);
app.use('/api/chamado', chamadoRouter);
app.use('/api/atividadechamado', atividadeChamadoRouter);

// Servir os arquivos estáticos da documentação
// Todos os arquivos dentro de 'public' serão acessíveis.
// Ex: public/docpi/index.html -> /docpi/index.html
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`📖 Servidor rodando na porta ${PORT}`);
    console.log(`Documentação disponível em http://localhost:${PORT}/api-docs`);
});
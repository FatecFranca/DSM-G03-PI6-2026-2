// src/utils/validaDados.js

function validarEmail(email) {
    // Verificar se o e-mail existe e é uma string
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Remover espaços em branco no início e no final
    const emailTrim = email.trim();

    // Verificar se está vazio após remover espaços
    if (emailTrim.length === 0) {
        return false;
    }

    // Expressão regular para validar e-mail
    // Permite: letras, números, pontos, hífens, underline e +
    // Domínio deve ter pelo menos 2 caracteres após o ponto final
    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    return regexEmail.test(emailTrim);
}

function validarTelefone(telefone, options = {}) {
    // Configurações padrão
    const {
        minDigits = 10,
        maxDigits = 11,
        allowFormatted = true,
        requireDDD = true,
        requireNinthDigit = false,
        minLength = 10,
        maxLength = 16
    } = options;

    // Verificar se o telefone existe e é uma string
    if (!telefone || typeof telefone !== 'string') {
        return false;
    }

    // Remover espaços em branco no início e no final
    const telefoneTrim = telefone.trim();

    // Verificar se está vazio após remover espaços
    if (telefoneTrim.length === 0) {
        return false;
    }

    // Verificar tamanho da string (se allowFormatted for true)
    if (allowFormatted) {
        // Remover apenas espaços para verificar o comprimento mínimo
        const semEspacos = telefoneTrim.replace(/\s/g, '');
        if (semEspacos.length < minLength) {
            return false;
        }
    }

    // Remover todos os caracteres não numéricos (parenteses, traços, espaços, etc.)
    const apenasNumeros = telefoneTrim.replace(/\D/g, '');

    // Verificar se a quantidade de dígitos está dentro do intervalo permitido
    if (apenasNumeros.length < minDigits || apenasNumeros.length > maxDigits) {
        return false;
    }

    // Verificar se contém apenas números
    if (!/^\d+$/.test(apenasNumeros)) {
        return false;
    }

    // Se exigir DDD, verificar se tem pelo menos 2 dígitos para DDD
    if (requireDDD && apenasNumeros.length < 10) {
        return false;
    }

    // Se exigir nono dígito (celular), verificar se tem 11 dígitos
    if (requireNinthDigit && apenasNumeros.length !== 11) {
        return false;
    }

    // Se exigir nono dígito (celular), verificar se o nono dígito é 9
    if (requireNinthDigit && apenasNumeros.length === 11 && apenasNumeros[2] !== '9') {
        return false;
    }

    // Se tiver 11 dígitos, verificar se o nono dígito é 9 (celular)
    if (apenasNumeros.length === 11 && apenasNumeros[2] !== '9') {
        return false;
    }

    return true;
}

module.exports = {
    validarEmail,
    validarTelefone
};

// scripts/criptografarSenha.js
const bcrypt = require('bcrypt');
const readline = require('readline');

// Criar interface para entrada do usuário
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para criptografar senha
async function criptografarSenha(senha) {
    try {
        // Gerar salt (fator 10 - mesmo usado nos controllers)
        const salt = await bcrypt.genSalt(10);
        
        senha = 'PEPPER_SENHA_ADMIN_NO.env' + senha

        // Criptografar senha
        const hash = await bcrypt.hash(senha, salt);
        
        return hash;
    } catch (error) {
        console.error('Erro ao criptografar senha:', error);
        throw error;
    }
}

// Função principal
async function main() {
    console.log('=== CRIPTOGRAFADOR DE SENHAS ===\n');
    
    rl.question('Digite a senha a ser criptografada: ', async (senha) => {
        if (!senha || senha.trim() === '') {
            console.log('\n❌ Erro: Senha não pode estar vazia!');
            rl.close();
            return;
        }

        if (senha.length < 6) {
            console.log('\n⚠️  Aviso: A senha tem menos de 6 caracteres. O mínimo recomendado é 6 caracteres.');
        }

        try {
            console.log('\n⏳ Criptografando...');
            const hash = await criptografarSenha(senha);
            
            console.log('\n✅ Senha criptografada com sucesso!');
            console.log('\n📌 Resultado:');
            console.log('─'.repeat(50));
            console.log(hash);
            console.log('─'.repeat(50));
            console.log('\n💡 Dica: Copie este hash e use no banco de dados.');
            
        } catch (error) {
            console.log('\n❌ Erro ao criptografar senha:', error.message);
        } finally {
            rl.close();
        }
    });
}

// Executar script
// node scripts-mostrar/criptografarSenha.js
main();
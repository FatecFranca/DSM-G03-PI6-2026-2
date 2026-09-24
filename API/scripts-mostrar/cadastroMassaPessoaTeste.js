// seed-pessoas.js
const prisma = require('../src/prisma.js');

const nomes = [
  // Femininos comuns
  'Ana', 'Beatriz', 'Carla', 'Daniela', 'Eduarda', 'Fernanda', 'Gabriela', 'Helena',
  'Isabela', 'Juliana', 'Karina', 'Larissa', 'Mariana', 'Natália', 'Olívia', 'Patrícia',
  'Rafaela', 'Sofia', 'Tatiane', 'Vanessa', 'Amanda', 'Bruna', 'Camila', 'Débora',
  'Elaine', 'Flávia', 'Giovana', 'Heloísa', 'Ingrid', 'Jéssica', 'Kelly', 'Letícia',
  'Michele', 'Nicole', 'Priscila', 'Renata', 'Simone', 'Tânia', 'Vitória', 'Yasmin',
  'Alice', 'Bianca', 'Carolina', 'Diana', 'Emanuelle', 'Fabiana', 'Graziella', 'Isadora',
  'Joana', 'Lorena', 'Manuela', 'Nayara', 'Paula', 'Raquel', 'Sabrina', 'Talita',
  'Valentina', 'Wanessa', 'Zélia', 'Cláudia',

  // Masculinos comuns
  'Bruno', 'Carlos', 'Daniel', 'Eduardo', 'Felipe', 'Gabriel', 'Henrique', 'Igor',
  'João', 'Kleber', 'Lucas', 'Marcos', 'Nathan', 'Otávio', 'Paulo', 'Rafael',
  'Samuel', 'Thiago', 'Vitor', 'Wesley', 'Alexandre', 'Bernardo', 'Caio', 'Diego',
  'Emerson', 'Fernando', 'Gustavo', 'Heitor', 'Isaac', 'Júlio', 'Kevin', 'Leandro',
  'Matheus', 'Nicolas', 'Oscar', 'Pedro', 'Ricardo', 'Sérgio', 'Tomás', 'Ubirajara',
  'Vinícius', 'Wagner', 'Yuri', 'André', 'Breno', 'César', 'Davi', 'Enzo',
  'Fábio', 'Guilherme', 'Hugo', 'Ivan', 'Jorge', 'Luan', 'Murilo', 'Noah',
  'Renan', 'Rodrigo', 'Salvador', 'Tarcísio',

  // Compostos / de origem variada
  'Ana Clara', 'Ana Júlia', 'Maria Eduarda', 'Maria Fernanda', 'João Pedro',
  'João Vitor', 'Luiz Henrique', 'Luis Fernando', 'Carlos Eduardo', 'Pedro Henrique',
  'Aimée', 'Akira', 'Alessandra', 'Alessandro', 'Amélia', 'Aparecida', 'Ariane', 'Aurora',
  'Benício', 'Benedito', 'Caetano', 'Cecília', 'Ciro', 'Clarice', 'Cora', 'Dandara',
  'Davi Lucca', 'Dolores', 'Elisa', 'Eloá', 'Enzo Gabriel', 'Ester', 'Eunice', 'Ezequiel',
  'Frida', 'Gael', 'Genivaldo', 'Gisele', 'Iara', 'Iracema', 'Ítalo', 'Jade',
  'Jandira', 'Joaquim', 'Kaique', 'Lara', 'Lázaro', 'Lívia', 'Lorenzo', 'Maíra',
  'Maitê', 'Márcia', 'Mauro', 'Miguel', 'Moacir', 'Naomi', 'Nara', 'Neuza',
  'Odete', 'Olga', 'Osvaldo', 'Pietra', 'Quéren', 'Ravi', 'Rita', 'Rosana',
  'Rute', 'Sandra', 'Sebastião', 'Selma', 'Sueli', 'Tereza', 'Ubiratã', 'Ursula',
  'Vera', 'Wanda', 'Xênia', 'Yara', 'Zara', 'Zilda', 'Zuleica', 'Alessia',
  'Dante', 'Giovanni', 'Lorenzo', 'Matteo', 'Pietro', 'Rafaela', 'Sofia', 'Valentina'
];

const sobrenomes = [
  // Portugueses / comuns
  'Silva', 'Souza', 'Lima', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Almeida',
  'Ribeiro', 'Martins', 'Carvalho', 'Gomes', 'Rocha', 'Barbosa', 'Araújo', 'Melo',
  'Freitas', 'Nogueira', 'Cardoso', 'Teixeira', 'Ferreira', 'Rodrigues', 'Alves', 'Monteiro',
  'Mendes', 'Moreira', 'Vieira', 'Dias', 'Nascimento', 'Azevedo', 'Cavalcanti', 'Fonseca',
  'Pinto', 'Batista', 'Correia', 'Miranda', 'Machado', 'Lopes', 'Marques', 'Campos',
  'Cunha', 'Duarte', 'Farias', 'Figueiredo', 'Franco', 'Guimarães', 'Leal', 'Leite',
  'Macedo', 'Magalhães', 'Maia', 'Moraes', 'Neves', 'Peixoto', 'Pires', 'Queiroz',
  'Ramos', 'Reis', 'Sales', 'Sampaio', 'Siqueira', 'Tavares', 'Vasconcelos', 'Viana',

  // De origem indígena / africana
  'Aimoré', 'Araci', 'Arapiraca', 'Caetano', 'Guarani', 'Ibirapuera', 'Jandira', 'Jussara',
  'Kaingang', 'Moacir', 'Potiguara', 'Tamoio', 'Tupã', 'Ubiratã', 'Xavante', 'Yara',
  'Bantu', 'Dandara', 'Ganga', 'Iemanjá', 'Jabuti', 'Kalunga', 'Kiluanji', 'Lundu',
  'Maianga', 'Ndongo', 'Oyá', 'Quilombo', 'Semba', 'Terreiro', 'Uanga', 'Zumbi',

  // Italianos
  'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo',
  'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Barbieri',
  'Ferrari', 'Esposito', 'Bianco', 'Fabbri', 'Moretti', 'Fontana', 'Serra', 'Rossi',

  // Alemães
  'Schmidt', 'Müller', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
  'Schulz', 'Hoffmann', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder',

  // Japoneses
  'Yamamoto', 'Tanaka', 'Suzuki', 'Takahashi', 'Watanabe', 'Nakamura', 'Kobayashi', 'Sato',

  // Espanhóis / italianos / árabes
  'García', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez',
  'Haddad', 'Nasser', 'Salomão', 'Abraão', 'Amado', 'Assis', 'Bittencourt', 'Bragança'
];

const ddds = ['11','16','21','31','41','51','61','71','81','85'];

function gerarTelefone(i) {
  const ddd = ddds[i % ddds.length];
  const numero = String(90000000 + i).padStart(9, '0');
  return `${ddd}9${numero.slice(1)}`;
}

function gerarCPF(i) {
  const n = String(i).padStart(11, '0');
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9,11)}`;
}

async function main() {
  const pessoas = [];
  for (let i = 1; i <= 576; i++) {
    const nome = `${nomes[i % nomes.length]} ${sobrenomes[(i * 3) % sobrenomes.length]} ${sobrenomes[(i * 7) % sobrenomes.length]}`;
    pessoas.push({
      UnidadeId: 2,
      PessoaNome: nome,
      PessoaEmail: `pessoa${i}@teste.com`,
      PessoaTelefone: gerarTelefone(i),
      PessoaCPF: gerarCPF(i),
      PessoaSenha: 'pessoa123',
      PessoaStatus: 'ATIVA',
    });
  }

  await prisma.pessoa.createMany({ data: pessoas });
  console.log(`✅ ${pessoas.length} pessoas cadastradas.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
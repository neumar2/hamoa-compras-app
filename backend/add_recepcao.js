const bcrypt = require('bcryptjs');
const { User } = require('./src/database/models');

async function addRecepcao() {
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('hamoa123', salt);
    
    const [user, created] = await User.findOrCreate({
      where: { email: 'recepcao@hamoa.com' },
      defaults: {
        name: 'Recepção',
        password: passwordHash,
        role: 'EVENTOS'
      }
    });

    if (created) {
      console.log('Usuário Recepção criado com sucesso!');
    } else {
      console.log('Usuário Recepção já existe.');
    }
    process.exit(0);
  } catch (error) {
    console.error('Erro ao adicionar recepção:', error);
    process.exit(1);
  }
}

addRecepcao();

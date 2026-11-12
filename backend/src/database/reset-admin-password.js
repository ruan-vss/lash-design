
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool } from '../config/database.js';

const resetAdminPassword = async () => {
  try {
    const email = env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'Configure SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no arquivo .env.'
      );
    }

    if (password.length < 12) {
      throw new Error('A nova senha deve ter pelo menos 12 caracteres.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = TRUE,
           token_version = token_version + 1,
           password_changed_at = NOW()
       WHERE LOWER(email) = LOWER($2)
         AND role = 'ADMIN'
       RETURNING id, email`,
      [passwordHash, email]
    );

    if (result.rowCount === 0) {
      console.error(
        'Nenhum administrador encontrado com esse e-mail. Confira SEED_ADMIN_EMAIL no .env.'
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      `Senha atualizada para o administrador: ${result.rows[0].email}`
    );
    console.log('Faça login com a nova senha definida no .env.');
    console.log('O sistema poderá exigir a troca da senha no primeiro acesso.');
  } catch (error) {
    console.error('Erro ao atualizar a senha:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

resetAdminPassword();

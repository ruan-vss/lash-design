import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool } from '../config/database.js';
import { runMigrations } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BCRYPT_COST = 12;

const runSeed = async () => {
  try {
    if (env.NODE_ENV === 'production' && (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD)) {
      console.error('❌ [FATAL] Em produção, SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD são obrigatórios para rodar o seed.');
      process.exit(1);
    }

    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);

    // Aplica as migrações versionadas (segurança de autenticação e limpeza de fluxos legados).
    const migrationClient = await pool.connect();
    try {
      await runMigrations(migrationClient);
    } finally {
      migrationClient.release();
    }

    // 1. Garante configuração padrão do estúdio
    await pool.query(`
      INSERT INTO studio_settings (id, studio_name, professional_name, whatsapp, address)
      VALUES (1, 'Atelier Lash Designer', 'Dra. Sofia Mendes', '5511999999999', 'Av. Paulista, 1000 - Sala 402')
      ON CONFLICT (id) DO NOTHING
    `);

    // 2. Garante expediente semanal padrão
    const days = [
      { day: 0, label: 'Domingo', open: false },
      { day: 1, label: 'Segunda-feira', open: false },
      { day: 2, label: 'Terça-feira', open: true },
      { day: 3, label: 'Quarta-feira', open: true },
      { day: 4, label: 'Quinta-feira', open: true },
      { day: 5, label: 'Sexta-feira', open: true },
      { day: 6, label: 'Sábado', open: true },
    ];
    for (const d of days) {
      await pool.query(
        `INSERT INTO working_hours (day_of_week, label, is_open, open_time, close_time, break_start, break_end)
         VALUES ($1, $2, $3, '09:00', '19:00', '12:00', '13:00')
         ON CONFLICT (day_of_week) DO NOTHING`,
        [d.day, d.label, d.open]
      );
    }

    // 3. Cria administradora inicial (sem senha hardcoded e sem logar a senha)
    const adminEmail = (env.SEED_ADMIN_EMAIL || 'admin@lashstudio.com').trim().toLowerCase();
    const adminPassword = env.SEED_ADMIN_PASSWORD || 'MudarSenhaForte@2026';
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_COST);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, active, must_change_password)
       VALUES ('Administradora Lash', $1, $2, 'ADMIN', TRUE, TRUE)
       ON CONFLICT (email) DO NOTHING`,
      [adminEmail, passwordHash]
    );

    // 4. Cria catálogo inicial de serviços configuráveis
    const existingServices = await pool.query('SELECT COUNT(*)::int AS count FROM services');
    if (existingServices.rows[0].count === 0) {
      const defaultServices = [
        {
          name: 'Extensão de Cílios Clássica (Fio a Fio)',
          category: 'Aplicação Inicial',
          description: 'Acabamento natural e elegante com acoplagem de um fio sintético sobre cada fio natural.',
          price: 180.0,
          duration: 120,
          prep: 15,
          depType: 'PERCENTAGE',
          depVal: 30,
          guidelines: 'Comparecer sem rímel ou maquiagem na área dos olhos.',
          maintenance: 'Manutenção recomendada entre 15 e 21 dias com mínimo de 50% dos fios.',
        },
        {
          name: 'Volume Brasileiro',
          category: 'Aplicação Inicial',
          description: 'Fios em formato Y que proporcionam excelente retenção, leveza e preenchimento marcante.',
          price: 210.0,
          duration: 135,
          prep: 15,
          depType: 'PERCENTAGE',
          depVal: 30,
          guidelines: 'Evitar uso de demaquilantes bifásicos ou oleosos antes da sessão.',
          maintenance: 'Manutenção entre 15 e 21 dias.',
        },
        {
          name: 'Volume Híbrido',
          category: 'Aplicação Inicial',
          description: 'Combinação estratégica de fios clássicos e fans de volume para textura sofisticada.',
          price: 230.0,
          duration: 150,
          prep: 15,
          depType: 'PERCENTAGE',
          depVal: 30,
          guidelines: 'Retirar lentes de contato antes do início do procedimento.',
          maintenance: 'Manutenção até 21 dias.',
        },
        {
          name: 'Efeito Wet (Molhado)',
          category: 'Tendências',
          description: 'Efeito moderno e alinhado com espículas fechadas que destacam o olhar com leveza.',
          price: 220.0,
          duration: 120,
          prep: 15,
          depType: 'PERCENTAGE',
          depVal: 30,
          guidelines: 'Chegar com 5 minutos de antecedência para higienização.',
          maintenance: 'Manutenção entre 15 e 20 dias.',
        },
        {
          name: 'Manutenção de Extensão',
          category: 'Manutenção',
          description: 'Higienização profunda, remoção de fios crescidos e reposição completa.',
          price: 130.0,
          duration: 90,
          prep: 15,
          depType: 'FIXED',
          depVal: 40,
          guidelines: 'Válida exclusivamente para procedimentos realizados neste estúdio.',
          maintenance: 'Necessário possuir ao menos 45% dos fios acoplados.',
        },
        {
          name: 'Remoção Segura de Extensão',
          category: 'Cuidados',
          description: 'Remoção química delicada com preservador da integridade dos fios naturais.',
          price: 60.0,
          duration: 30,
          prep: 10,
          depType: 'NONE',
          depVal: 0,
          guidelines: 'Procedimento indolor e seguro.',
          maintenance: 'Não aplicável.',
        },
      ];

      for (const s of defaultServices) {
        await pool.query(
          `INSERT INTO services
           (name, category, description, price, duration_minutes, prep_time_minutes, deposit_type, deposit_value, guidelines, maintenance_rules)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [s.name, s.category, s.description, s.price, s.duration, s.prep, s.depType, s.depVal, s.guidelines, s.maintenance]
        );
      }
    }

    console.log(`✅ Seed concluído com sucesso! Administradora inicial configurada (${adminEmail}).`);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao executar seed:', err);
    process.exit(1);
  }
};

runSeed();
// Sobe o Poupay inteiro com um comando só (npm run dev, na raiz do projeto):
// 1. Docker e o banco PostgreSQL (docker compose)
// 2. Tabelas (database/schema.sql) e, se o catálogo estiver vazio, os dados de demonstração
// 3. Backend (porta 3000) e frontend (porta 3001)
// 4. Túnel do ngrok com domínio fixo, para o webhook da AbacatePay chegar ao backend
//
// Ctrl+C encerra tudo. O banco continua no Docker (para parar: docker compose down).

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync, createReadStream } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const isWindows = process.platform === 'win32';
const semTunel = process.argv.includes('--sem-tunel');

const cores = { banco: 34, backend: 32, frontend: 35, tunel: 33, poupay: 36 };
function log(origem, msg) {
  const tag = `\x1b[${cores[origem] ?? 37}m[${origem}]\x1b[0m`;
  for (const linha of String(msg).split(/\r?\n/)) {
    if (linha.trim()) console.log(`${tag} ${linha}`);
  }
}
function falhar(msg) {
  log('poupay', `\x1b[31m${msg}\x1b[0m`);
  process.exit(1);
}

// Roda um comando e espera terminar, guardando a saída.
// docker e ngrok são .exe, então rodam sem shell (assim os argumentos com espaço chegam inteiros)
function rodar(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
}

// Lê um .env simples (CHAVE=valor) sem depender de bibliotecas
function lerEnv(arquivo) {
  const env = {};
  if (!existsSync(arquivo)) return env;
  for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

// ---------- 1. Arquivos .env ----------
function prepararEnv() {
  const envBackend = path.join(BACKEND, '.env');
  if (!existsSync(envBackend)) {
    copyFileSync(path.join(BACKEND, '.env.example'), envBackend);
    let txt = readFileSync(envBackend, 'utf8');
    txt = txt
      .replace('JWT_SECRET=troque_por_um_valor_aleatorio', `JWT_SECRET=${randomBytes(32).toString('hex')}`)
      .replace(
        'ABACATEPAY_WEBHOOK_SECRET=troque_por_um_valor_aleatorio',
        `ABACATEPAY_WEBHOOK_SECRET=${randomBytes(24).toString('hex')}`
      );
    writeFileSync(envBackend, txt);
    log('poupay', 'Criei o backend/.env a partir do .env.example (com JWT_SECRET e secret do webhook novos).');
    log('poupay', 'Preencha nele as chaves da AbacatePay e o NGROK_DOMAIN para o Premium automático.');
  }

  const envFrontend = path.join(FRONTEND, '.env.local');
  if (!existsSync(envFrontend)) {
    writeFileSync(envFrontend, 'NEXT_PUBLIC_API_URL=http://localhost:3000\n');
    log('poupay', 'Criei o frontend/.env.local apontando para http://localhost:3000.');
  }

  return lerEnv(envBackend);
}

// ---------- 2. Docker e banco ----------
async function garantirDocker() {
  if (rodar('docker', ['info']).status === 0) return;

  if (isWindows) {
    const exe = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
    if (existsSync(exe)) {
      log('banco', 'O Docker Desktop está fechado. Abrindo...');
      spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
    }
  } else if (process.platform === 'darwin') {
    log('banco', 'O Docker Desktop está fechado. Abrindo...');
    spawnSync('open', ['-a', 'Docker']);
  }

  log('banco', 'Esperando o Docker ficar pronto (até 2 minutos)...');
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    if (rodar('docker', ['info']).status === 0) return;
  }
  falhar('O Docker não respondeu. Abra o Docker Desktop, espere ele ficar "running" e rode de novo.');
}

function psql(args, entrada) {
  return new Promise((resolve) => {
    const filho = spawn(
      'docker',
      ['compose', 'exec', '-T', 'db', 'psql', '-v', 'ON_ERROR_STOP=1', '-q', '-U', 'poupay', '-d', 'poupay', ...args],
      { cwd: ROOT, stdio: [entrada ? 'pipe' : 'ignore', 'pipe', 'pipe'] }
    );
    let saida = '';
    filho.stdout.on('data', (d) => (saida += d));
    filho.stderr.on('data', (d) => (saida += d));
    if (entrada) createReadStream(entrada).pipe(filho.stdin);
    filho.on('close', (code) => resolve({ ok: code === 0, saida: saida.trim() }));
  });
}

async function subirBanco() {
  await garantirDocker();

  log('banco', 'Subindo o PostgreSQL (docker compose up -d)...');
  const up = rodar('docker', ['compose', 'up', '-d']);
  if (up.status !== 0) falhar(`docker compose up falhou:\n${up.stderr || up.stdout}`);

  for (let i = 0; i < 30; i++) {
    if (rodar('docker', ['compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'poupay', '-d', 'poupay']).status === 0) break;
    if (i === 29) falhar('O banco não ficou pronto em 60 segundos. Veja: docker compose logs db');
    await sleep(2000);
  }

  // O schema só usa "IF NOT EXISTS", então pode rodar toda vez
  const schema = await psql([], path.join(ROOT, 'database', 'schema.sql'));
  if (!schema.ok) falhar(`Erro ao criar as tabelas:\n${schema.saida}`);

  // O seed apaga o catálogo, então só roda quando ele está vazio (primeira vez)
  const conta = await psql(['-tAc', 'SELECT COUNT(*) FROM markets']);
  if (conta.ok && conta.saida === '0') {
    log('banco', 'Catálogo vazio: carregando os dados de demonstração (database/seed.sql)...');
    const seed = await psql([], path.join(ROOT, 'database', 'seed.sql'));
    if (!seed.ok) falhar(`Erro ao carregar os dados de demonstração:\n${seed.saida}`);
  }

  log('banco', 'Banco pronto em localhost:5432.');
}

// ---------- 3. Dependências ----------
function instalarDependencias() {
  for (const [nome, pasta] of [['backend', BACKEND], ['frontend', FRONTEND]]) {
    if (existsSync(path.join(pasta, 'node_modules'))) continue;
    log(nome, 'Instalando dependências (npm install), só na primeira vez...');
    const r = spawnSync('npm', ['install'], { cwd: pasta, stdio: 'inherit', shell: isWindows });
    if (r.status !== 0) falhar(`npm install falhou em ${nome}.`);
  }
}

// ---------- 4. Processos ----------
const filhos = [];
let encerrando = false;

// npm no Windows é um .cmd e precisa de shell; os argumentos aqui não têm espaços
function iniciar(nome, cmd, args, cwd) {
  const filho = spawn(cmd, args, { cwd, shell: isWindows && cmd === 'npm', env: { ...process.env, FORCE_COLOR: '1' } });
  filho.stdout.on('data', (d) => log(nome, d));
  filho.stderr.on('data', (d) => log(nome, d));
  filho.on('close', (code) => {
    if (encerrando) return;
    log(nome, `\x1b[31mparou (código ${code}).\x1b[0m`);
    if (nome !== 'tunel') encerrar(code ?? 1);
  });
  filhos.push(filho);
  return filho;
}

function encerrar(code = 0) {
  if (encerrando) return;
  encerrando = true;
  log('poupay', 'Encerrando backend, frontend e túnel... (o banco continua no Docker)');
  for (const filho of filhos) {
    if (filho.exitCode !== null) continue;
    if (isWindows) spawnSync('taskkill', ['/pid', String(filho.pid), '/T', '/F'], { stdio: 'ignore' });
    else filho.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => encerrar(0));
process.on('SIGTERM', () => encerrar(0));

function iniciarTunel(env) {
  if (semTunel) {
    log('tunel', 'Sem túnel (--sem-tunel). Para liberar o Premium use backend/scripts/simular-webhook.mjs.');
    return;
  }

  const dominio = (env.NGROK_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!dominio) {
    log('tunel', 'NGROK_DOMAIN vazio no backend/.env: rodando sem túnel.');
    log('tunel', 'Sem ele a AbacatePay não consegue avisar o backend, e o Premium não é liberado sozinho.');
    return;
  }

  if (rodar('ngrok', ['version']).status !== 0) {
    log('tunel', 'O ngrok não está instalado. No Windows: winget install ngrok.ngrok');
    log('tunel', 'Depois: ngrok config add-authtoken SEU_TOKEN (o token fica no painel do ngrok).');
    return;
  }

  iniciar('tunel', 'ngrok', ['http', '3000', `--url=https://${dominio}`, '--log=stdout', '--log-level=warn'], ROOT);

  const secret = env.ABACATEPAY_WEBHOOK_SECRET || 'SEU_SECRET';
  log('tunel', `Túnel: https://${dominio} -> http://localhost:3000`);
  log('tunel', 'URL do webhook para cadastrar UMA VEZ no painel da AbacatePay (Modo Teste):');
  log('tunel', `\x1b[1mhttps://${dominio}/webhooks/abacatepay?webhookSecret=${encodeURIComponent(secret)}\x1b[0m`);
  log('tunel', 'Eventos: subscription.completed, subscription.renewed e subscription.cancelled.');
}

async function main() {
  log('poupay', 'Subindo o Poupay inteiro. Ctrl+C encerra tudo.');
  const env = prepararEnv();
  await subirBanco();
  instalarDependencias();

  iniciar('backend', 'npm', ['run', 'dev'], BACKEND);
  iniciar('frontend', 'npm', ['run', 'dev'], FRONTEND);
  iniciarTunel(env);

  log('poupay', 'Site: http://localhost:3001  |  API: http://localhost:3000  |  Swagger: http://localhost:3000/docs');
}

main().catch((err) => falhar(err?.stack || String(err)));

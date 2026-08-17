import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const perfis = [
    "Admin",
    "Direção",
    "Secretaria",
    "Coordenação",
    "Comunicação",
    "Docente",
    "Aluno",
    "Responsável"
  ];

  for (const nome of perfis) {
    await prisma.perfil.upsert({
      where: { nome },
      update: {},
      create: { nome, descricao: `Perfil ${nome}` }
    });
  }

  const adminEmail = "admin@egv.edu.br";
  const admin = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      nome: "Admin EGV",
      email: adminEmail,
      senhaHash: await hashPassword("Admin@123"),
      status: "ATIVO",
      superAdmin: true
    }
  });

  const perfilAdmin = await prisma.perfil.findUnique({ where: { nome: "Admin" } });
  if (perfilAdmin) {
    await prisma.usuarioPerfil.upsert({
      where: { usuarioId_perfilId: { usuarioId: admin.id, perfilId: perfilAdmin.id } },
      update: {},
      create: { usuarioId: admin.id, perfilId: perfilAdmin.id }
    });
  }

  const noticia = await prisma.noticia.upsert({
    where: { slug: "bem-vindos-portal-egv" },
    update: {},
    create: {
      titulo: "Bem-vindos ao portal da EGV",
      resumo: "Acompanhe notícias, documentos e o diário escolar em um só lugar.",
      conteudo: "<p>Este é o novo portal institucional da Escola Municipal Getúlio Vargas.</p>",
      slug: "bem-vindos-portal-egv",
      status: "PUBLICADO",
      dataPublicacao: new Date()
    }
  });

  const evento = await prisma.evento.findFirst({ where: { titulo: "Reunião pedagógica" } });
  if (!evento) {
    await prisma.evento.create({
      data: {
        titulo: "Reunião pedagógica",
        descricao: "Encontro com docentes para planejamento do semestre.",
        dataInicio: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        local: "Auditório"
      }
    });
  }

  await prisma.paginaInstitucional.upsert({
    where: { slug: "escola" },
    update: {},
    create: {
      titulo: "Nossa escola",
      conteudo: "<p>Conheça a história e a missão da Escola Municipal Getúlio Vargas.</p>",
      slug: "escola",
      visivel: true,
      ordem: 1
    }
  });

  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    await prisma.banner.createMany({
      data: [
        {
          titulo: "Educação de Qualidade para o Futuro",
          descricao: "Portal Institucional da Escola Municipal Getúlio Vargas. Compromisso com o ensino, inovação e transparência acadêmica para toda a comunidade.",
          imagem: "/placeholder-escola.jpg",
          ordem: 1,
          ativo: true
        },
        {
          titulo: "Matrículas Abertas 2024",
          descricao: "Garanta sua vaga! Processo de renovação de matrículas para o ensino fundamental já começou. Confira os prazos e documentos necessários.",
          imagem: "/placeholder-matricula.jpg",
          link: "/noticias",
          ordem: 2,
          ativo: true
        }
      ]
    });
  }

  const documentoExistente = await prisma.arquivoDocumento.findFirst({ where: { nome: "Regimento Interno" } });
  if (!documentoExistente) {
    await prisma.arquivoDocumento.create({
      data: {
        nome: "Regimento Interno",
        caminho: "./uploads/regimento.pdf",
        tipo: "application/pdf",
        tamanho: 12345,
        categoria: "Institucional",
        ano: new Date().getFullYear(),
        versao: 1,
        status: "ATIVO"
      }
    });
  }

  const turmaExistente = await prisma.turma.findFirst({ where: { identificacao: "5A" } });
  if (!turmaExistente) {
    await prisma.turma.create({
      data: {
        anoLetivo: new Date().getFullYear(),
        serie: "5º ano",
        identificacao: "5A",
        turno: "Manhã"
      }
    });
  }

  await prisma.disciplina.upsert({
    where: { nome: "Matemática" },
    update: {},
    create: { nome: "Matemática", cargaHoraria: 0, areaConhecimento: "Exatas" }
  });

  const turma = await prisma.turma.findFirst();
  const disciplina = await prisma.disciplina.findUnique({ where: { nome: "Matemática" } });

  if (turma && disciplina) {
    const alunoExistente = await prisma.aluno.findFirst({ where: { nome: "Maria Souza" } });
    
    if (!alunoExistente) {
      const aluno = await prisma.aluno.create({
        data: {
          nome: "Maria Souza",
          dataNascimento: new Date(2014, 4, 10),
          cpf: "000.000.000-00",
          contatoResponsavel: "(00) 0000-0000",
          responsavelPrincipal: "João Souza"
        }
      });

      await prisma.matricula.create({
        data: {
          alunoId: aluno.id,
          turmaId: turma.id,
          anoLetivo: turma.anoLetivo,
          situacao: "ATIVA"
        }
      });

      const diario = await prisma.diarioAula.create({
        data: {
          turmaId: turma.id,
          disciplinaId: disciplina.id,
          professorId: null,
          dataAula: new Date(),
          conteudoMinistrado: "Operações básicas"
        }
      });

      await prisma.registroFrequencia.create({
        data: {
          diarioAulaId: diario.id,
          alunoId: aluno.id,
          presenca: true
        }
      });

      await prisma.nota.create({
        data: {
          alunoId: aluno.id,
          disciplinaId: disciplina.id,
          valor: 8.5
        }
      });
    }
  }

  console.log("✅ Seed finalizado com sucesso!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

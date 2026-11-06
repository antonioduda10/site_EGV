if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Este projeto exige Node 24 LTS. Selecione essa versao antes de executar os comandos.");
  process.exit(1);
}

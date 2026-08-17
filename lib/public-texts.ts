export type PublicTexts = {
  home: {
    eyebrow: string;
    title: string;
    description: string;
    newsTitle: string;
    newsDescription: string;
    eventsTitle: string;
    eventsDescription: string;
  };
  noticias: {
    title: string;
    description: string;
  };
  institucional: {
    label: string;
    description: string;
  };
  galeria: {
    eyebrow: string;
    title: string;
    description: string;
  };
  contato: {
    title: string;
    description: string;
  };
};

type PartialPublicTexts = {
  [Section in keyof PublicTexts]?: Partial<PublicTexts[Section]>;
};

export const defaultPublicTexts: PublicTexts = {
  home: {
    eyebrow: "Educação de Qualidade para o Futuro",
    title: "Escola Municipal Getúlio Vargas",
    description:
      "Portal Institucional da Escola Municipal Getúlio Vargas. Compromisso com o ensino, inovação e transparência acadêmica para toda a comunidade.",
    newsTitle: "Últimas Notícias",
    newsDescription: "Acompanhe as últimas atualizações, avisos e conquistas da nossa escola.",
    eventsTitle: "Próximos Eventos",
    eventsDescription: "Fique por dentro das reuniões, feriados e datas acadêmicas importantes da nossa escola."
  },
  noticias: {
    title: "Notícias",
    description: "Informações, avisos e atualizações da escola."
  },
  institucional: {
    label: "Portal EGV",
    description: "Conteúdo institucional da Escola Municipal Getúlio Vargas para consulta da comunidade escolar."
  },
  galeria: {
    eyebrow: "Memórias da escola",
    title: "Galeria",
    description:
      "Explore registros em fotos, vídeos e mídias que contam um pouco da rotina, dos projetos e dos momentos especiais da Escola Municipal Getúlio Vargas."
  },
  contato: {
    title: "Estamos prontos para ouvir você",
    description:
      "Envie solicitações, sugestões, dúvidas ou recados para a equipe da escola. Sua mensagem será encaminhada para o setor responsável e acompanhada pelo painel administrativo."
  }
};

export function parsePublicTexts(value?: string | null): PublicTexts {
  if (!value) return mergePublicTexts();

  try {
    const parsed = JSON.parse(value);
    return mergePublicTexts(parsed && typeof parsed === "object" ? (parsed as PartialPublicTexts) : undefined);
  } catch {
    return mergePublicTexts();
  }
}

export function mergePublicTexts(texts?: PartialPublicTexts | null): PublicTexts {
  return {
    home: {
      eyebrow: pickText(texts?.home?.eyebrow, defaultPublicTexts.home.eyebrow),
      title: pickText(texts?.home?.title, defaultPublicTexts.home.title),
      description: pickText(texts?.home?.description, defaultPublicTexts.home.description),
      newsTitle: pickText(texts?.home?.newsTitle, defaultPublicTexts.home.newsTitle),
      newsDescription: pickText(texts?.home?.newsDescription, defaultPublicTexts.home.newsDescription),
      eventsTitle: pickText(texts?.home?.eventsTitle, defaultPublicTexts.home.eventsTitle),
      eventsDescription: pickText(texts?.home?.eventsDescription, defaultPublicTexts.home.eventsDescription)
    },
    noticias: {
      title: pickText(texts?.noticias?.title, defaultPublicTexts.noticias.title),
      description: pickText(texts?.noticias?.description, defaultPublicTexts.noticias.description)
    },
    institucional: {
      label: pickText(texts?.institucional?.label, defaultPublicTexts.institucional.label),
      description: pickText(texts?.institucional?.description, defaultPublicTexts.institucional.description)
    },
    galeria: {
      eyebrow: pickText(texts?.galeria?.eyebrow, defaultPublicTexts.galeria.eyebrow),
      title: pickText(texts?.galeria?.title, defaultPublicTexts.galeria.title),
      description: pickText(texts?.galeria?.description, defaultPublicTexts.galeria.description)
    },
    contato: {
      title: pickText(texts?.contato?.title, defaultPublicTexts.contato.title),
      description: pickText(texts?.contato?.description, defaultPublicTexts.contato.description)
    }
  };
}

function pickText(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

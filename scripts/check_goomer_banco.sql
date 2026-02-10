-- Checagem das tabelas Goomer no banco
-- Rode no Supabase: SQL Editor > New query > cole e execute

-- 1) goomer_unidades: empresas/unidades cadastradas
SELECT 'goomer_unidades' AS tabela, COUNT(*) AS total FROM goomer_unidades;
SELECT * FROM goomer_unidades ORDER BY nome_goomer LIMIT 20;

-- 2) goomer_nps_mensal: registros de NPS por unidade/mês
SELECT 'goomer_nps_mensal' AS tabela, COUNT(*) AS total FROM goomer_nps_mensal;
SELECT unidade_id, mes_referencia, COUNT(*) AS qtd
  FROM goomer_nps_mensal
  GROUP BY unidade_id, mes_referencia
  ORDER BY mes_referencia DESC, unidade_id
  LIMIT 20;

-- 3) Unidade_ids distintos que têm NPS (para o dropdown de Empresa)
SELECT DISTINCT unidade_id FROM goomer_nps_mensal ORDER BY unidade_id;

-- 4) Outras tabelas goomer (contagem)
SELECT 'goomer_feedbacks' AS tabela, COUNT(*) AS total FROM goomer_feedbacks
UNION ALL
SELECT 'goomer_importacoes', COUNT(*) FROM goomer_importacoes
UNION ALL
SELECT 'goomer_pesquisa_respostas', COUNT(*) FROM goomer_pesquisa_respostas
UNION ALL
SELECT 'goomer_scores_mensal', COUNT(*) FROM goomer_scores_mensal;

-- 5) EMPRESAS: unidade_id que aparecem nos dados (feedbacks, nps_mensal, scores)
WITH unidades_em_dados AS (
  SELECT unidade_id FROM goomer_feedbacks WHERE unidade_id IS NOT NULL
  UNION
  SELECT unidade_id FROM goomer_nps_mensal WHERE unidade_id IS NOT NULL
  UNION
  SELECT unidade_id FROM goomer_scores_mensal WHERE unidade_id IS NOT NULL
  UNION
  SELECT unidade_id FROM goomer_pesquisa_respostas WHERE unidade_id IS NOT NULL
)
SELECT u.unidade_id,
       gu.nome_goomer,
       gu.id_empresa_goomer,
       CASE WHEN gu.id IS NOT NULL THEN 'Sim' ELSE 'Não' END AS esta_em_goomer_unidades
  FROM (SELECT DISTINCT unidade_id FROM unidades_em_dados) u
  LEFT JOIN goomer_unidades gu ON gu.id = u.unidade_id
  ORDER BY gu.nome_goomer NULLS LAST, u.unidade_id;

-- 6) Resumo: quantas empresas na goomer_unidades vs quantas aparecem nos dados
SELECT (SELECT COUNT(*) FROM goomer_unidades) AS empresas_em_goomer_unidades,
       (SELECT COUNT(DISTINCT unidade_id) FROM (
         SELECT unidade_id FROM goomer_feedbacks
         UNION SELECT unidade_id FROM goomer_nps_mensal
         UNION SELECT unidade_id FROM goomer_scores_mensal
         UNION SELECT unidade_id FROM goomer_pesquisa_respostas
       ) t WHERE unidade_id IS NOT NULL) AS empresas_nos_dados;

# Templates de Exportação Power BI → Meta10

## Como usar:
1. Abra o **DAX Studio** conectado ao seu modelo Power BI
2. Cole a query DAX da entidade desejada
3. Execute e exporte como **CSV** (File → Export → CSV)
4. Na plataforma Meta10, clique no botão **Importar Planilha** (ícone roxo) no card da entidade

---

## 1. Vendas (Sales)

```dax
EVALUATE
FILTER(
  SUMMARIZECOLUMNS(
    VendaItemGeral[Empresa],
    VendaItemGeral[idVenda],
    VendaItemGeral[dt_contabil],
    VendaItemGeral[CodigoMaterial],
    VendaItemGeral[modo_venda_descr],
    VendaItemGeral[CodigoFuncionario],
    "cost", [CMV],
    "quantity", [Quantidades],
    "total_value", [Vendas Valor]
  ),
  NOT ISBLANK([quantity])
)
```

**Colunas esperadas:** Empresa, idVenda, dt_contabil, CodigoMaterial, modo_venda_descr, CodigoFuncionario, cost, quantity, total_value

---

## 2. Caixa (Cash Flow)

```dax
EVALUATE
FILTER(
  SUMMARIZECOLUMNS(
    CaixaItem[tipo],
    CaixaItem[Empresa],
    CaixaItem[idCaixa],
    CaixaItem[meio_nome],
    CaixaItem[modo_venda],
    CaixaItem[dt_contabil],
    CaixaItem[CodigoFuncionario],
    "amount", [Caixa]
  ),
  NOT ISBLANK([amount])
)
```

**Colunas esperadas:** tipo, Empresa, idCaixa, meio_nome, modo_venda, dt_contabil, CodigoFuncionario, amount

---

## 3. Fluxo de Caixa / DRE (Cash Flow Statement)

```dax
EVALUATE
FILTER(
  SUMMARIZECOLUMNS(
    Extrato[Filial],
    Extrato[idCategoria],
    Extrato[Data movimento],
    "amount", [Resultado2]
  ),
  NOT ISBLANK([amount])
)
```

**Colunas esperadas:** Filial, idCategoria, Data movimento, amount

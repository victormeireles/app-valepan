"use client";

import { useMemo, useState } from "react";
import type { ProductSaleRow } from "@/lib/sheets";
import { formatK } from "@/lib/sheets";

type Mode = "cliente" | "produto";

export default function DrilldownTable({
  data,
  mode,
  selection,
}: {
  data: ProductSaleRow[];
  mode: Mode;
  selection: string | null; // cliente quando mode=cliente, produto quando mode=produto
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<
    "valor" | "unidades" | "pacotes" | "caixas" | "mb" | "pmp" | "cmp"
  >("valor");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const rows = useMemo(() => {
    if (!selection) return [];
    const filtered = data.filter((r) =>
      mode === "cliente" ? r.cliente === selection : r.produto === selection
    );

    // Agrupar pelo outro eixo
    const groupKey = (r: ProductSaleRow) =>
      mode === "cliente" ? r.produto : r.cliente;

    const map = new Map<
      string,
      {
        key: string;
        unidades: number;
        pacotes: number;
        caixas: number;
        valor: number;
        cmv: number;
      }
    >();

    for (const r of filtered) {
      const k = groupKey(r) || "-";
      const cur =
        map.get(k) ||
        {
          key: k,
          unidades: 0,
          pacotes: 0,
          caixas: 0,
          valor: 0,
          cmv: 0,
        };
      cur.unidades += r.quantidade || 0;
      cur.pacotes += r.pacotes || 0;
      cur.caixas += r.caixas || 0;
      cur.valor += r.valorTotal || 0;
      cur.cmv += r.custoTotal || 0;
      map.set(k, cur);
    }

    const list = Array.from(map.values())
      .filter((i) => i.key.toLowerCase().includes(search.toLowerCase()))
      .map((i) => {
        const mb = i.valor > 0 ? Math.max(-100, Math.min(100, (1 - i.cmv / i.valor) * 100)) : 0;
        const pmp = i.pacotes > 0 ? i.valor / i.pacotes : 0;
        const cmp = i.pacotes > 0 ? i.cmv / i.pacotes : 0;
        return { ...i, mb, pmp, cmp };
      })
      .sort((a, b) => {
        const dir = sortDir === "desc" ? -1 : 1;
        return (a[sortKey] as number) < (b[sortKey] as number) ? dir : -dir;
      });

    return list;
  }, [data, mode, selection, search, sortKey, sortDir]);

  const setSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const title = mode === "cliente" ? "Produtos desse cliente" : "Clientes desse produto";

  return (
    <div className="card">
      <div className="table-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div className="search-wrap" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--panel-border)", borderRadius: 8, padding: "8px 10px" }}
          />
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{mode === "cliente" ? "Produto" : "Cliente"}</th>
              <th onClick={() => setSort("unidades")} style={{ cursor: "pointer" }}>Unidades</th>
              <th onClick={() => setSort("pacotes")} style={{ cursor: "pointer" }}>Pacotes</th>
              <th onClick={() => setSort("caixas")} style={{ cursor: "pointer" }}>Caixas</th>
              <th onClick={() => setSort("valor")} style={{ cursor: "pointer" }}>Valor</th>
              <th onClick={() => setSort("mb")} style={{ cursor: "pointer" }}>Margem Bruta</th>
              <th onClick={() => setSort("pmp")} style={{ cursor: "pointer" }}>PMP</th>
              <th onClick={() => setSort("cmp")} style={{ cursor: "pointer" }}>CMP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.key}</td>
                <td className="amount">{r.unidades.toLocaleString("pt-BR")}</td>
                <td className="amount">{formatK(r.pacotes)}</td>
                <td className="amount">{r.caixas.toLocaleString("pt-BR")}</td>
                <td className="amount">{r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className="amount">{Math.round(r.mb)}%</td>
                <td className="amount">{r.pmp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="amount">{r.cmp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



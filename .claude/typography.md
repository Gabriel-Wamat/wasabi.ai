# Tipografia — Personal Hub (Wasabi)

## Fontes escolhidas

| Contexto | Fonte | Fallback |
|---|---|---|
| Interface (UI) | **Inter** | `system-ui, sans-serif` |
| Código / mono | **JetBrains Mono** | `'Fira Code', monospace` |

---

## Variáveis CSS

Adicionar em `apps/web/src/app/globals.css`:

```css
/* ── Typography ── */
--font-ui:   'Inter',          system-ui, -apple-system, sans-serif;
--font-code: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

---

## Importação (Next.js)

Em `apps/web/src/app/layout.tsx`:

```tsx
import { Inter } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-code',
  display: 'swap',
})

// Adicionar ao <html>:
// className={`${inter.variable} ${jetbrainsMono.variable}`}
```

---

## Aplicação nos elementos

```css
/* Base — todos os elementos de interface */
body, button, input, textarea, select {
  font-family: var(--font-ui);
}

/* Blocos de código e URLs */
code, pre, kbd, samp,
.agenda-time,
.mono {
  font-family: var(--font-code);
  font-feature-settings: 'liga' 1, 'calt' 1; /* ligaduras */
}
```

---

## Escala tipográfica (Apple HIG)

| Token | Tamanho | Peso | Uso |
|---|---|---|---|
| `--tx-xs` | 10px | 700 | Eyebrow, labels uppercase |
| `--tx-sm` | 11px | 500–600 | Meta, badges, captions |
| `--tx-body` | 13px | 400–500 | Corpo de texto padrão |
| `--tx-ui` | 13px | 600 | Botões, itens de nav |
| `--tx-sub` | 14px | 600–700 | Subtítulos de seção |
| `--tx-title` | 17px | 700 | Títulos de página (h1) |
| `--tx-num` | 22px | 700 | Números em stat cards |

---

## Hierarquia visual recomendada

```
EYEBROW (10px, 700, uppercase, letter-spacing 0.1em, cor muted)
  Título (17px, 700, letter-spacing -0.01em)
    Subtítulo de seção (14px, 700)
      Corpo / item de lista (13px, 500)
        Meta / descrição (12px, 400, cor var(--t2))
          Caption / badge (11px, 600, cor var(--t3))
```

---

## Referências

- [Inter — rsms.me/inter](https://rsms.me/inter/)
- [JetBrains Mono — jetbrains.com/lp/mono](https://www.jetbrains.com/lp/mono/)
- [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)

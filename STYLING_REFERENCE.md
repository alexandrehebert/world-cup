# Stadium Item Styling - Quick Reference

## 🎨 Visual Effects

### 1. Background Effects
```css
/* Base State */
Background Layer 1: Linear gradient (opacity: 10%)
Background Layer 2: Overlay gradient (opacity: 85% → 70% → 60%)

/* Hover State */
Background Layer 1: Linear gradient (opacity: 25%) + 105% scale
Background Layer 2: Overlay gradient (opacity: 80% → 65%)
```

### 2. Border & Shadow
```css
/* Base State */
border: 1px solid var(--border)
shadow: none

/* Hover State */
border: 1px solid var(--accent-border)/70
shadow: 0 10px 15px -3px rgba(0,0,0,0.1)

/* Selected State */
border: 1px solid var(--accent-border)
shadow: 0 10px 15px -3px rgba(0,0,0,0.1)
ring: 2px solid var(--accent-border)/20
```

### 3. Transform Effects
```css
/* Base State */
translate: 0
scale: 1 (content)

/* Hover State */
translate: translateY(-0.125rem)  /* Lifts up slightly */
scale: 1.05 (background only)

/* Icon in Header */
scale: 1.1 on group-hover
```

### 4. Transitions
```css
/* Main Container */
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)

/* Background */
transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1)

/* Icon */
transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1)
```

## 📱 Responsive Classes

```tailwind
grid-cols-1              /* Mobile: 1 column */
md:grid-cols-2          /* Tablet: 2 columns */
xl:grid-cols-3          /* Desktop: 3 columns */
gap-3                   /* Spacing between items */
```

## 🎯 State Matrix

| State | Border | Shadow | Ring | Background Opacity | Transform |
|-------|--------|--------|------|-------------------|-----------|
| Base | --border | none | none | 10% | none |
| Hover | --accent-border/70 | lg | none | 25% | -0.5 up |
| Selected | --accent-border | lg | ring-2 | 10% | none |
| Hover + Selected | --accent-border | lg | ring-2 | 25% | -0.5 up |

## 🔧 Customization Points

### Colors
Located in: `src/lib/stadium-images.ts`

```typescript
// Adjust these values in hashStadiumKeyToColor():
const hue1 = Math.abs(hash) % 360        // 0-360°
const hue2 = (hue1 + 120) % 360         // Change interval
const saturation = 60 + Math.abs(hash % 20)  // 60-80%
const lightness = 45 + Math.abs(hash % 15)   // 45-60%
```

### Opacity Levels
Located in: `src/components/stadiums/stadium-item.tsx`

```tailwind
opacity-10              → Change base background visibility
group-hover:opacity-25  → Change hover background visibility
from-[var(--surface)]/85 → Top of overlay gradient
via-[var(--surface)]/70  → Middle of overlay gradient
to-[var(--surface)]/60   → Bottom of overlay gradient
```

### Scale & Transform
```tailwind
group-hover:scale-105    → Change background zoom (105% = +5%)
hover:-translate-y-0.5   → Change lift height
group-hover:scale-110    → Change icon scale
```

### Timing
```tailwind
duration-200  → Main transitions (200ms)
duration-300  → Background transitions (300ms)
```

## 🌙 Theme Support

All colors use CSS variables that adapt to theme:
- `var(--surface)` - Card background
- `var(--border)` - Card border
- `var(--accent-border)` - Highlight border
- `var(--text-strong)` - Main text
- `var(--text-soft)` - Secondary text
- `var(--accent-text)` - Accent color

Works with:
- ☀️ Light theme
- 🌙 Dark theme
- 🔵 Colorblind theme

## 📊 Performance Tips

1. **GPU Acceleration**: Uses `transform` and `opacity` (GPU-friendly)
2. **Will-change**: Pre-optimizes animations if needed
3. **Reduced Motion**: Respects `prefers-reduced-motion` setting
4. **No Repaints**: Background changes use `opacity` and `transform`

## 🧪 Testing Checklist

- [ ] Hover effect visible on desktop
- [ ] Touch states work on mobile
- [ ] Selected state distinct from hover
- [ ] Gradient visible but doesn't overwhelm text
- [ ] Works in light/dark/colorblind modes
- [ ] Smooth transitions (no janky animations)
- [ ] Icon scales smoothly
- [ ] Text remains readable throughout

## 📐 Grid Layout

```
┌─────────────────────────┐
│ Stadium Name     [Icon] │  ← Header (flex)
├─────────────────────────┤
│ Location: City, Country │
│ Capacity: X,000 seats   │  ← Details (grid)
│ Opened: 2020            │
│ TimeZone: UTC-5         │
│ Matches: 5              │
│ First KO: 2026-06-15    │
│ Last KO: 2026-07-20     │
└─────────────────────────┘
```

## 🎬 Animation Timeline

1. **User hovers** (0ms)
2. **Border starts to lighten** (0-200ms)
3. **Shadow grows** (0-200ms)
4. **Card lifts up** (0-200ms)
5. **Background opacity increases** (0-300ms)
6. **Background zooms** (0-300ms)
7. **Icon scales** (0-200ms)

All animations run in parallel for smooth, snappy feel.

## 🔗 Related Files

- Component: `src/components/stadiums/stadium-item.tsx`
- Styles: `src/lib/stadium-images.ts` (gradient generation)
- Usage: `src/views/stadiums-page.tsx`
- Guide: `STADIUM_IMAGES_GUIDE.md`

---

Last Updated: July 5, 2026

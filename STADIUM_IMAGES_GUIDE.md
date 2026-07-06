# Stadium Images Implementation Guide

## Overview

Stadium items now display dynamic gradient backgrounds based on their unique key. The system supports both generated gradients and actual stadium images.

## Current Implementation

- **Gradient Backgrounds**: Each stadium gets a unique, deterministic color gradient based on its key
- **Image Support**: Images can be added to `public/assets/stadiums/` and mapped in the system
- **Styling Effects**: 
  - Hover effect with background zoom (105% scale)
  - Gradient overlay that adapts on hover
  - Shadow and border transitions
  - Optional ring effect when selected

## Adding Real Stadium Images

### Option 1: Manual Download (Recommended for Quality Control)

1. **Download Images**
   - Find high-quality stadium exterior photos (1200x800px minimum)
   - Save in `public/assets/stadiums/` with names like: `at-t-stadium.jpg`
   - Optimize images using tools like:
     - ImageOptim
     - TinyPNG
     - Squoosh

2. **Update Mapping**
   - Edit `src/lib/stadium-images.ts`
   - Add URL mappings:
   ```typescript
   export const STADIUM_IMAGE_MAP: Readonly<Record<string, string | null>> = {
     "at&t stadium|united states": "/assets/stadiums/at-t-stadium.jpg",
     // ... more mappings
   }
   ```

### Option 2: Automated Download Script

Use an image API service. Uncomment and configure in `scripts/download-stadium-images.mjs`:

```bash
node scripts/download-stadium-images.mjs
```

Popular free image APIs:
- **Unsplash API**: Requires API key, high quality, up to 50k requests/month
- **Pexels API**: Free, no auth needed, high quality, up to 200 requests/hour
- **Pixabay API**: Requires API key, high quality

### Option 3: Use a CDN Service

Update the mapping to use URLs directly from a CDN or image service:

```typescript
export const STADIUM_IMAGE_MAP = {
  "at&t stadium|united states": "https://images.example.com/stadiums/att-stadium.jpg",
  // ...
}
```

## File Structure

```
public/
└── assets/
    └── stadiums/
        ├── at-t-stadium.jpg
        ├── arrowhead-stadium.jpg
        └── ... (more stadium images)

src/
├── lib/
│   └── stadium-images.ts  (Mapping and style generators)
└── components/
    └── stadiums/
        └── stadium-item.tsx  (UI component with background effects)
```

## CSS Classes and Effects

The `StadiumItem` component applies:

- **Base State**: 
  - `opacity-10` background with gradient overlay
  - `border-[var(--border)]` styling

- **Hover State**:
  - `opacity-25` background (increased visibility)
  - `scale-105` background zoom
  - Border lightens to `hover:border-[var(--accent-border)]/70`
  - Slight upward translation: `hover:-translate-y-0.5`
  - Enhanced shadow: `hover:shadow-lg`

- **Selected State**:
  - `border-[var(--accent-border)]` - more prominent border
  - `shadow-lg` - larger shadow
  - `ring-2 ring-[var(--accent-border)]/20` - accent ring

## Performance Considerations

- Images are cached by browsers
- Gradients are generated client-side (no server overhead)
- Lazy load images using Next.js Image component if adding real images:

```typescript
import Image from 'next/image'

// In stadium-item.tsx, replace the div with:
{imageUrl && (
  <Image
    src={imageUrl}
    alt={stadium.stadium}
    fill
    className="absolute inset-0"
    style={{ objectFit: 'cover' }}
    priority={false}
  />
)}
```

## Styling Customization

Edit `src/components/stadiums/stadium-item.tsx` to adjust:

- Gradient opacity: Change `opacity-10` and `group-hover:opacity-25`
- Hover effects: Modify `scale-105`, `-translate-y-0.5`
- Colors: Update gradient colors in `src/lib/stadium-images.ts`
- Animation duration: Change `duration-200`, `duration-300`

## Testing

After adding images:

1. Run linter: `npm run lint`
2. Build: `npm run build`
3. Check visual appearance in browser
4. Test on different screen sizes (mobile, tablet, desktop)

## Troubleshooting

- **Images not showing**: Check file paths and CORS headers
- **Gradients too bright/dim**: Adjust opacity values in `stadium-item.tsx`
- **Performance issues**: Optimize image file sizes
- **Style conflicts**: Check Tailwind class ordering in className

## Future Enhancements

- [ ] Add parallax scroll effect on stadium images
- [ ] Add blur effect on background image
- [ ] Implement image lazy loading with placeholder
- [ ] Add stadium statistics to hover tooltip
- [ ] Cache generated gradients for performance

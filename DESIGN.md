# TeraBox Player Visual System

## Direction: Modern Minimal (Dark Mode First)
A quiet, precise, software-native aesthetic adapted for a premium media streaming experience. Focuses on content density, crisp typography, and subtle glass effects.

## Tokens (OKLch)
- `--bg`: `oklch(12% 0.01 250)` (Deep obsidian)
- `--surface`: `oklch(18% 0.01 250)` (Elevated glass/panel)
- `--fg`: `oklch(98% 0.01 250)` (Primary text)
- `--muted`: `oklch(60% 0.01 250)` (Secondary/metadata)
- `--border`: `oklch(25% 0.02 250)` (Hairline dividers)
- `--accent`: `oklch(65% 0.18 250)` (Vibrant electric blue)

## Typography
- **Display**: Inter (Medium/SemiBold) with `-0.02em` tracking.
- **Body**: Inter (Regular).
- **Mono**: JetBrains Mono for technical metadata/sizes.

## Posture
- 16px corner radius for cards, 12px for small modules.
- Hairline borders (1px) with subtle internal glows.
- Glassmorphism: `backdrop-filter: blur(20px) saturate(180%)`.
- Mobile-first layout with bottom navigation on small screens.

---
order: 1
---

# Banner Icons Configuration

This file manages the banner icons displayed on the site. Add icons to the `icons` folder and configure them here.

## Configuration Format

Each icon entry should have:
- `name`: Display name (max length should fit icon width)
- `icon`: Icon file name (without extension)
- `link`: Target URL
- `order`: Display order (lower numbers first)

## Example Icons

```yaml
icons:
  - name: "JVID官方"
    icon: "jvid-official"
    link: "https://example.com"
    order: 1
  - name: "高清写真"
    icon: "hd-photos"
    link: "https://example.com"
    order: 2
  - name: "会员专区"
    icon: "vip-zone"
    link: "https://example.com"
    order: 3
```

## Notes

- Icons should be placed in the `icons` folder
- Supported formats: PNG, JPG, SVG
- Recommended size: 64x64px or higher
- Names should be concise to fit within icon width

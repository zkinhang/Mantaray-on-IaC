---
name: notion-hub-sync
description: Integrated MantaRay Knowledge Hub synchronization tool.
---

# Notion Hub Sync (Integrated)

This skill is now fully integrated into the `Mantaray-on-IaC` ecosystem.

## Structure
- **Scripts**: `skills/notion-hub-sync/scripts/`
- **Config**: `skills/notion-hub-sync/config/`
- **Knowledge Storage**: `/home/EEC/clawd/docs/notion_sync/` (Linked)

## Commands

### 📥 Sync from Notion (Download Published)
```bash
uv --project ~/.uv-global run python3 /home/EEC/clawd/Mantaray-on-IaC/skills/notion-hub-sync/scripts/manta_hub_sync.py
```

### 📤 Upload to Notion (Upload Pending)
```bash
uv --project ~/.uv-global run python3 /home/EEC/clawd/Mantaray-on-IaC/skills/notion-hub-sync/scripts/manta_hub_upload.py
```

## Protocol
- **Bot Uploads**: Always set to `Pending`.
- **Human Approval**: Move to `Published` in Notion to trigger local sync.

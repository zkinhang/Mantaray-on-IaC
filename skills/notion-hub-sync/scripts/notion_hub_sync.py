import os
import json
import requests
import hashlib

# Load config with standardized path and name
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "notion_hub_config.json")
with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)

NOTION_KEY = os.environ.get("NOTION_API_KEY") or open(os.path.expanduser("~/.config/notion/api_key")).read().strip()
HEADERS = {
    "Authorization": f"Bearer {NOTION_KEY}",
    "Notion-Version": CONFIG["notion"]["version"],
    "Content-Type": "application/json"
}

STATE_FILE = os.path.join(os.path.dirname(__file__), "..", "config", "sync_state.json")

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def get_blocks(block_id):
    url = f"https://api.notion.com/v1/blocks/{block_id}/children"
    response = requests.get(url, headers=HEADERS)
    return response.json().get("results", []) if response.status_code == 200 else []

def block_to_md(block):
    b_type = block.get("type")
    if b_type not in block: return ""
    rich_text = block[b_type].get("rich_text", [])
    text = "".join([t.get("plain_text", "") for t in rich_text])
    if b_type == "paragraph": return text + "\n\n"
    elif b_type == "heading_1": return f"# {text}\n\n"
    elif b_type == "heading_2": return f"## {text}\n\n"
    elif b_type == "heading_3": return f"### {text}\n\n"
    elif b_type == "bulleted_list_item": return f"* {text}\n"
    elif b_type == "code":
        lang = block["code"].get("language", "")
        return f"```{lang}\n{text}\n```\n\n"
    return ""

def sync_from_hub():
    db_id = CONFIG["notion"]["database_id"]
    url = f"https://api.notion.com/v1/databases/{db_id}/query"
    payload = {"filter": {"property": "Status", "select": {"equals": "Published"}}}
    response = requests.post(url, headers=HEADERS, json=payload)
    if response.status_code != 200: 
        print(f"ERROR: Sync failed - {response.text}")
        return

    pages = response.json().get("results", [])
    
    state = load_state()
    current_published_files = []
    synced_files = []
    skipped_files = []
    cleanup_files = []
    
    for page in pages:
        props = page.get("properties", {})
        title_list = props.get("Name", {}).get("title", [])
        title = "".join([t.get("plain_text", "") for t in title_list]) if title_list else "Untitled"
        
        domain_raw = props.get("Domain", {}).get("select", {}).get("name", "UNK")
        type_raw = props.get("Type", {}).get("select", {}).get("name", "UNK")
        
        domain_code = CONFIG["mappings"]["domains"].get(domain_raw, "UNK")
        type_code = CONFIG["mappings"]["types"].get(type_raw, "UNK")
        
        clean_title = title.replace(" ", "_").replace("/", "-")
        final_filename = f"{domain_code}_{type_code}_{clean_title}.md"
        current_published_files.append(final_filename)
        
        last_edited_time = page.get("last_edited_time")
        
        # Check if page has been updated since last sync
        if state.get(final_filename) == last_edited_time and os.path.exists(os.path.join(CONFIG["paths"]["published"], final_filename)):
            skipped_files.append(final_filename)
            continue

        blocks = get_blocks(page["id"])
        md = f"# {title}\n\n"
        for b in blocks: md += block_to_md(b)
        
        out_path = os.path.join(CONFIG["paths"]["published"], final_filename)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w") as f: f.write(md)
        state[final_filename] = last_edited_time
        synced_files.append(final_filename)

    # Cleanup logic
    published_dir = CONFIG["paths"]["published"]
    if os.path.exists(published_dir):
        local_files = [f for f in os.listdir(published_dir) if f.endswith(".md")]
        for local_f in local_files:
            if local_f not in current_published_files:
                os.remove(os.path.join(published_dir, local_f))
                cleanup_files.append(local_f)
                if local_f in state:
                    del state[local_f]

    save_state(state)
    
    # Precise Output for Robot/Human parsing
    print(f"DOWNLOAD_SUMMARY:")
    print(f"SYNCED: {', '.join(synced_files) if synced_files else 'None'}")
    print(f"SKIPPED: {', '.join(skipped_files) if skipped_files else 'None'}")
    print(f"CLEANUP: {', '.join(cleanup_files) if cleanup_files else 'None'}")

if __name__ == "__main__":
    sync_from_hub()
